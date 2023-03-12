'use strict'

const DEFAULT_MODE = 'color';
const DEFAULT_COLOR = '#505050';
const DEFAULT_BRUSH_SIZE = 0;
const DEFAULT_SIZE = 20;
const DEFAULT_GRIDLINES = true;

let mode = DEFAULT_MODE;
let color = DEFAULT_COLOR;
let brushSize = DEFAULT_BRUSH_SIZE;
let size = DEFAULT_SIZE;
let hasGridlines = DEFAULT_GRIDLINES;
let isMouseDown = false;
let cells = [];
let historyBuffer = [];
let historyUndo = [];
let historyRedo = [];

const modes = document.querySelector('.modes');
const btnClear = document.querySelector('.btn-clear');
const btnUndo = document.querySelector('.btn-undo');
const btnRedo = document.querySelector('.btn-redo');
const btnGridlines = document.querySelector('.btn-gridlines');
const colorPicker = document.querySelector('.btn-color__picker');
const brushSizeSlider = document.querySelector('.btn-brush-size__slider');
const sizeSlider = document.querySelector('.btn-size__slider');
const grid = document.querySelector('.grid');

modes.addEventListener('click', setMode);
btnClear.addEventListener('click', clearGrid);
btnUndo.addEventListener('click', undo);
btnRedo.addEventListener('click', redo);
btnGridlines.addEventListener('click', updateGridlines);
brushSizeSlider.addEventListener('input', updateBrushSize);
sizeSlider.addEventListener('input', updateSizeLabel);
sizeSlider.addEventListener('change', resizeGrid);
grid.addEventListener('mouseover', draw);
grid.addEventListener('mousedown', draw);
grid.addEventListener('touchmove', draw);
grid.addEventListener('mouseover', addOutline);
grid.addEventListener('mouseout', removeOutline);
document.addEventListener('mousedown', () => isMouseDown = true);
document.addEventListener('mouseup', () => isMouseDown = false);
document.addEventListener('mouseup', saveHistory);
document.addEventListener('touchend', saveHistory);

colorPicker.value = color;
brushSizeSlider.value = brushSize;
sizeSlider.value = size;

setMode();
clearGrid();
createGrid();

function setMode(e) {
  // Only 1 mode button can be selected (highlighted)
  // Starts with color button selected by default
  // Clicking color picker selects its parent button
  // Clicking any other non-button in the modes section is ignored
  let nearestButton = (e) ? e.target.closest('button[data-mode]') :
                      modes.querySelector(`button[data-mode="${mode}"]`);
  if (!nearestButton) return;
  mode = nearestButton.dataset.mode;
  
  const buttons = modes.querySelectorAll('button[data-mode]');
  for (const button of buttons) {
    button.classList.remove('btn--selected');                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
  }
  nearestButton.classList.add('btn--selected');
}

function createGrid() {
  let row = 1;
  let col = 1;
  cells = [];
  
  // Remove existing grid before creating a new one
  while(grid.firstChild) {
    grid.removeChild(grid.lastChild);
  }
  
  // Create a square grid
  grid.style.gridTemplate = `repeat(${size}, 1fr) / repeat(${size}, 1fr)`;
  for (let i = 1; i <= (size * size); i++) {
    const cell = document.createElement('div');    
    cell.classList.add('grid__cell');
    grid.appendChild(cell);
    
    // Track each cell (row, col, div) in an array of objects
    cells.push({
      row: row,
      col: col++,
      div: cell
    });

    if (i % size === 0) {
      row++;
      col = 1;
    }
  }

  updateGridlines();
  updateBrushSize();
  updateSizeLabel();
  addRoundedCorners();
}

function clearGrid() {
  for (const cell of grid.children) {
    cell.style.backgroundColor = '';
    cell.style.border = '';
  }
  clearHistory();
}

function draw(e) {
  // e.target is different for mouseover vs touchmove events
  // mouseover returns the cell the mouse is currently over (changes as you move - desired behavior), while
  // touchmove returns the cell that was first touched (does not change as you move)
  // For touchmove, use elementFromPoint instead
  const target = (!e.touches) ? e.target :
                 document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);

  if (!target) return;
  if (e.type === 'mouseover' && !isMouseDown) return;
  if (!target.classList.contains('grid__cell')) return;

  // Color cells according the chosen mode
  const selection = getDrawArea(target);
  selection.forEach((cell) => {
    let oldColor = getComputedStyle(cell).backgroundColor;

    color = (mode === 'color') ? colorPicker.value :
            (mode === 'random') ? getRandomColor() :
            (mode === 'darken') ? getShadingColor(cell, -20) :
            (mode === 'lighten') ? getShadingColor(cell, 20) :
            '';
    
    // The same cell may be painted multiple times in a single brushstroke
    // Only save the most recent one in history so the undo/redo logic works correctly
    cell.style.backgroundColor = color; 
    const idx = historyBuffer.findIndex(item => item.div === cell);

    let originalColor = '';
    if (idx >= 0) {
      originalColor = historyBuffer[idx].oldColor;
      historyBuffer.splice(idx, 1);  // delete prior history if cell was already painted this round
    }
    historyBuffer.push({
      div: cell,
      oldColor: originalColor || oldColor,
      newColor: color
    });
  });

  historyRedo = [];
  enableButton(btnUndo);
  disableButton(btnRedo);
}

function getDrawArea(middleCell) {
  // Returns all cells that need to be painted based on the brush size
  const cell = cells.find(item => item.div === middleCell);
  let selection = [];
  let rowMin = clampEdges(cell.row - brushSize);
  let rowMax = clampEdges(cell.row + brushSize);
  let colMin = clampEdges(cell.col - brushSize);
  let colMax = clampEdges(cell.col + brushSize);

  for (let row = rowMin; row <= rowMax; row++) {
    for (let col = colMin; col <= colMax; col++) {
      let div = findCellByRowCol(row, col);
      selection.push(div);
    }
  }

  return selection;
}

function getRandomColor() {
  // Returns random color in RGB format
  // Each of the 3 colors ranges from 0 to 255

  let rgbArr = [];
  for (let i = 0; i < 3; i++) {
    rgbArr.push(Math.floor(Math.random() * 256));
  }
  return `rgb(${rgbArr})`;
}

function getShadingColor(cell, increment) {
  // To lighten or darken cell, add or subtract the same number from each RGB value
  // Each of the 3 colors ranges from 0 to 211

  const min = 0;    // Darkest = black RGB(0, 0, 0)
  const max = 211;  // Lightest = lightgray grid background RGB(211, 211, 211)
  const currentColor = getComputedStyle(cell).backgroundColor;
  const rgbArr = currentColor.slice(4, currentColor.length - 1).replace(/ /g, '').split(',');

  rgbArr.forEach((individualColor, i, arr) => {
    individualColor = Number(individualColor) + increment;
    arr[i] = Math.min(Math.max(individualColor, min), max);
  });

  return `rgb(${rgbArr})`;
}

function addOutline(e) {
  // Add borders with different color schemes depending on the selected mode
  // Color mode = border color matches color picker
  // Random mode = rainbow border (each border is a random color)
  if (!e.target.classList.contains('grid__cell')) return;
  const selection = getOutlineArea(e.target);
  
  selection.forEach(item => {
    const side = item.side;
    const cell = item.div;

    let borderColor;
    switch (mode) {
      case "color":
        borderColor = colorPicker.value;
        break;
      case "random":
        borderColor = getRandomColor();
        break;
      case "darken":
        borderColor = "black";
        break;
      case "lighten":
        borderColor = "gray";
        break;  
      case "eraser":
        borderColor = "white";
        break;
    }
  
    const border = `3px double ${borderColor}`;
    switch (side) {
      case "top":
        cell.style.borderTop = border;
        break;
      case "right":
        cell.style.borderRight = border;
        break;
      case "bottom":
        cell.style.borderBottom = border;
        break;
      case "left":
        cell.style.borderLeft = border;
        break;
    }

    cell.classList.add('grid__cell--outline');  
  });
}

function getOutlineArea(middleCell) {
  let row, col;
  let selection = [];
  const cell = cells.find(item => item.div === middleCell);

  // Returns the outline area based on the brush size
  // (array containing each cell and border side)
  for (let i = -brushSize; i <= brushSize ; i++) {
    row = clampEdges(cell.row - brushSize);
    col = clampEdges(cell.col + i);
    selection.push({
      div: findCellByRowCol(row, col), 
      side: "top"
    });

    row = clampEdges(cell.row + i);
    col = clampEdges(cell.col + brushSize);
    selection.push({
      div: findCellByRowCol(row, col), 
      side: "right"
    });

    row = clampEdges(cell.row + brushSize);
    col = clampEdges(cell.col + i);
    selection.push({
      div: findCellByRowCol(row, col), 
      side: "bottom"
    });

    row = clampEdges(cell.row + i);
    col = clampEdges(cell.col - brushSize);
    selection.push({
      div: findCellByRowCol(row, col), 
      side: "left"
    });
  }

  return selection;
}

function removeOutline() {
  const outlinedCells = document.querySelectorAll('.grid__cell--outline');
  outlinedCells.forEach(cell => {
    cell.classList.remove('grid__cell--outline');
    cell.style.border = ''
  });
}

function updateGridlines(e) {
  // Sets (1) gridlines (2) ON/OFF status
  // Toggles when grid button is clicked, otherwise uses current setting
  const gridlinesText = document.querySelector('.btn-gridlines__status-text');

  if (e) hasGridlines = !hasGridlines;

  for (const cell of grid.children) {
    if (hasGridlines) {
      gridlinesText.textContent = 'ON';
      cell.classList.add('grid__cell--gridlines');
    } else {
      gridlinesText.textContent = 'OFF';
      cell.classList.remove('grid__cell--gridlines');
    }
  }
}

function updateBrushSize(e) {
  if (e) brushSize = Number(e.target.value);
  const brushSizeLabel = document.querySelector('.btn-brush-size__label');
  
  // Brush size is constrained by the grid size
  const maxBrushSize = Math.ceil((size - 1) / 2);
  brushSize = Math.min(brushSize, maxBrushSize);
  brushSizeSlider.setAttribute('max', maxBrushSize);
  brushSizeLabel.textContent = `Brush Size: ${brushSize}`;
}

function resizeGrid(e) {
  size = Number(e.target.value);
  clearGrid();
  createGrid();
}

function updateSizeLabel(e) {
  const sizeLabel = document.querySelector('.btn-size__label');
  if (e) size = Number(e.target.value);
  sizeLabel.textContent = `Grid Size: ${size} x ${size}`;
}

function saveHistory() {
  // Empty the history buffer into the master history array with each brushstroke
  // Each buffer entry contains all the actions taken under a single brushstroke
  // Example: If you paint 20 cells in one go, undo/redo acts on all 20 cells
  // Master history stores up to 25 entries
  if (historyBuffer.length) {
    if (historyUndo.length >= 25) {
      historyUndo.shift();
    }
    historyUndo = [...historyUndo, [...historyBuffer]];
    historyBuffer = [];
  }
}

function undo() {
  const lastAction = historyUndo.pop();
  historyRedo = [...historyRedo, lastAction];
  
  lastAction.forEach(action => {
    action.div.style.backgroundColor = action.oldColor;
  });
  
  if (!historyUndo.length) disableButton(btnUndo);
  enableButton(btnRedo);
}

function redo() {
  const lastAction = historyRedo.pop();
  historyUndo = [...historyUndo, lastAction];
  
  lastAction.forEach(action => {
    action.div.style.backgroundColor = action.newColor;
  });

  if (!historyRedo.length) disableButton(btnRedo);
  enableButton(btnUndo);
}

function clearHistory() {
  historyBuffer = [];
  historyUndo = [];
  historyRedo = [];

  disableButton(btnUndo);
  disableButton(btnRedo);
}

function disableButton(button) {
  button.disabled = true;
  button.classList.add('btn--disabled');
}

function enableButton(button) {
  button.disabled = false;
  button.classList.remove('btn--disabled');
}

function addRoundedCorners() {
  // Calculate corner cell position (changes with grid size)
  const topLeftCell = document.querySelector(`.grid__cell:first-child`);
  const topRightCell = document.querySelector(`.grid__cell:nth-child(${size})`);
  const btmLeftCell = document.querySelector(`.grid__cell:nth-child(${size * size - size + 1})`);
  const btmRightCell = document.querySelector(`.grid__cell:last-child`);

  topLeftCell.classList.add('grid__cell--corner-top-left');
  topRightCell.classList.add('grid__cell--corner-top-right');
  btmRightCell.classList.add('grid__cell--corner-bottom-right');
  btmLeftCell.classList.add('grid__cell--corner-bottom-left');
}

function clampEdges(num) {
  // Used in getDrawArea and getOutlineArea to ensure borders are cropped at the edges
  // by restricting rows and columns to a value between 1 and the grid size
  return Math.min(Math.max(num, 1), size);
}

function findCellByRowCol(row, col) {
  return cells.find(item => item.row === row && item.col === col).div;
}