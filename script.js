'use strict'

let mode = 'color';
let color = '#505050';
let brushSize = 0;
let size = 20;
let hasGridlines = true;
let isMouseDown = false;
let prevCenterCell = null;

let cells = [];
let historyBuffer = [];
let historyUndo = [];
let historyRedo = [];

const modes = document.querySelector('.modes');
const btnUndo = document.querySelector('.btn-undo');
const btnRedo = document.querySelector('.btn-redo');
const btnClear = document.querySelector('.btn-clear');
const btnGridlines = document.querySelector('.btn-gridlines');
const colorPicker = document.querySelector('.btn-color__picker');
const brushSizeSlider = document.querySelector('.btn-brush-size__slider');
const sizeSlider = document.querySelector('.btn-size__slider');
const grid = document.querySelector('.grid');

modes.addEventListener('click', setMode);
btnUndo.addEventListener('click', undo);
btnRedo.addEventListener('click', redo);
btnClear.addEventListener('click', clearGrid);
btnGridlines.addEventListener('click', updateGridlines);
brushSizeSlider.addEventListener('input', updateBrushSize);
sizeSlider.addEventListener('input', updateSizeLabel);
sizeSlider.addEventListener('change', createGrid);
grid.addEventListener('pointerdown', draw);
grid.addEventListener('pointermove', draw);
grid.addEventListener('mouseover', addOutline);
grid.addEventListener('mouseout', removeOutline);
document.addEventListener('mousedown', () => isMouseDown = true);
document.addEventListener('mouseup', () => isMouseDown = false);
document.addEventListener('pointerup', saveHistory);

initialSetup();

function initialSetup() {
  colorPicker.value = color;
  brushSizeSlider.value = brushSize;
  sizeSlider.value = size;
  
  setMode();
  createGrid();  
}

function setMode(e) {
  // Only 1 mode button can be selected (highlighted) at a time
  // Clicking anywhere within a button selects it (ie. color picker or icon)
  // Clicking other non-buttons are ignored (ie. space between buttons)
  const modeButton = (e) ? e.target.closest('.btn[data-mode]') :
                     modes.querySelector(`.btn[data-mode="${mode}"]`);
  if (!modeButton) return;
  mode = modeButton.dataset.mode;
  
  const selectedButton = modes.querySelector('.btn--selected');
  if (selectedButton) selectedButton.classList.remove('btn--selected');                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
  modeButton.classList.add('btn--selected');
}

function createGrid() {
  let row = 1;
  let col = 1;
  cells = [];
  
  clearHistory();
  updateBrushSize();
  updateSizeLabel();

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
    
    // Track each cell {row, col, div} in cells array
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
  addRoundedCorners();
}

function clearGrid() {
  for (const cell of grid.children) {
    cell.style.backgroundColor = '';
  }
  clearHistory();
}

function draw(e) {
  // Paint the cells and write it to historyBuffer

  // e.target behaves differently for mouse vs touch pointermove events
  //   mouse - returns the cell the mouse is currently over (changes as you move - desired)
  //   touch - returns the cell that was first touched (doesn't change as you move - undesired)
  // For touch, use elementFromPoint instead of e.target to track cell movement
  const target = (e.pointerType === 'mouse') ? e.target :
                 document.elementFromPoint(e.x, e.y);

  if (e.type === 'pointermove' && e.pointerType === 'mouse' && !isMouseDown) return;
  if (!target.classList.contains('grid__cell')) return;
  if (!target) return;
  
  // Prevent sticky hover outline on touch devices
  if (e.type === 'pointerdown' && e.pointerType === 'touch') removeOutline();

  // Any movement causes cell to be painted
  // Do not repaint if still on same cell
  // This prevents darken/lighten from reaching max shade immediately,
  // and random from continuously changing colors
  if (target === prevCenterCell) return;
  prevCenterCell = target;

  const drawArea = getDrawArea(target);
  drawArea.forEach(cell => {
    // Paint cells according the chosen mode
    let oldColor = getComputedStyle(cell).backgroundColor;
    color = (mode === 'color') ? colorPicker.value :
            (mode === 'random') ? getRandomColor() :
            (mode === 'darken') ? getShadingColor(cell, -20) :
            (mode === 'lighten') ? getShadingColor(cell, 20) :
            '';
    cell.style.backgroundColor = color;
    
    // The same cell may be painted over multiple times in a single brushstroke
    // Only save the most recent one in history so the undo/redo logic works correctly
    const idx = historyBuffer.findIndex(historyItem => historyItem.div === cell);
    if (idx >= 0) {
      oldColor = historyBuffer[idx].oldColor;
      historyBuffer.splice(idx, 1);  // delete prior history for this cell
    }

    // Store each {div, oldColor, newColor} in history for undo/redo
    historyBuffer.push({
      oldColor: oldColor,
      newColor: color,
      div: cell
    });
  });

  historyRedo = [];
  enableButton(btnUndo);
  disableButton(btnRedo);
}

function getDrawArea(middleCell) {
  // Returns all cells that need to be painted based on the brush size
  // If it goes beyond the edges, crop accordingly
  const cell = cells.find(cellItem => cellItem.div === middleCell);
  const rowMin = clampEdges(cell.row - brushSize);
  const rowMax = clampEdges(cell.row + brushSize);
  const colMin = clampEdges(cell.col - brushSize);
  const colMax = clampEdges(cell.col + brushSize);
  const drawArea = [];

  for (let row = rowMin; row <= rowMax; row++) {
    for (let col = colMin; col <= colMax; col++) {
      const div = findCellByRowCol(row, col);
      drawArea.push(div);
    }
  }

  return drawArea;
}

function getRandomColor() {
  // Returns random color in RGB format
  // Each of the 3 colors ranges from 0 to 255
  const rgbArr = [];
  for (let i = 0; i < 3; i++) {
    rgbArr.push(Math.floor(Math.random() * 256));
  }

  return `rgb(${rgbArr})`;
}

function getShadingColor(cell, increment) {
  // Returns new shade in RGB format
  // To lighten or darken, add or subtract the same number from each RGB value
  // Each of the 3 colors ranges from 0 to 211 (not 255)

  const min = 0;    // Darkest = black, RGB(0, 0, 0)
  const max = 211;  // Lightest = lightgray grid background, RGB(211, 211, 211)
  const currentColor = getComputedStyle(cell).backgroundColor;
  const currentColorParsed = currentColor.slice(4, currentColor.length - 1).replace(/ /g, '').split(',');
  const rgbArr = currentColorParsed.map(individualColor => {
    const newColor = Number(individualColor) + increment;
    return Math.min(Math.max(newColor, min), max);
  });

  return `rgb(${rgbArr})`;
}

function addOutline(e) {
  // Add borders for the hover outline with mode-dependent color schemes
  // Color mode = border color matches color picker
  // Random mode = rainbow border (each border is a random color)
  if (!e.target.classList.contains('grid__cell')) return;
  
  const outlineArea = getOutlineArea(e.target);
  const borderWidthStyle = getComputedStyle(grid).getPropertyValue('--border-outline');

  outlineArea.forEach(outlineItem => {
    const side = outlineItem.borderSide;
    const cell = outlineItem.div;

    const borderColor = (mode === 'color') ? colorPicker.value :
                        (mode === 'random') ? getRandomColor() :
                        (mode === 'darken') ? 'black' :
                        (mode === 'lighten') ? 'darkgray' :
                        (mode === 'eraser') ? 'white' :
                        '';
  
    const border = `${borderWidthStyle} ${borderColor}`;
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
  // Returns {borderSide, div} for each cell that makes up the hover outline
  // Outline area is based on the brush size
  // If it goes beyond the edges, crop accordingly
  let row, col;
  const outlineArea = [];
  const cell = cells.find(cellItem => cellItem.div === middleCell);

  for (let i = -brushSize; i <= brushSize ; i++) {
    row = clampEdges(cell.row - brushSize);
    col = clampEdges(cell.col + i);
    outlineArea.push({
      borderSide: "top",
      div: findCellByRowCol(row, col)
    });

    row = clampEdges(cell.row + i);
    col = clampEdges(cell.col + brushSize);
    outlineArea.push({
      borderSide: "right",
      div: findCellByRowCol(row, col)
    });

    row = clampEdges(cell.row + brushSize);
    col = clampEdges(cell.col + i);
    outlineArea.push({
      borderSide: "bottom",
      div: findCellByRowCol(row, col)
    });

    row = clampEdges(cell.row + i);
    col = clampEdges(cell.col - brushSize);
    outlineArea.push({
      borderSide: "left",
      div: findCellByRowCol(row, col)
    });
  }

  return outlineArea;
}

function removeOutline() {
  const outlinedCells = document.querySelectorAll('.grid__cell--outline');
  outlinedCells.forEach(cell => {
    cell.classList.remove('grid__cell--outline');
    cell.style.border = ''
  });
}

function updateBrushSize() {
  // If grid is resized smaller, then the previous brush size may be too big,
  // and needs to be adjusted to the new maximum
  // Maximum brush size is constrained by the grid size
  const brushSizeLabel = document.querySelector('.btn-brush-size__label');
  const maxBrushSize = Math.floor(size / 2);

  brushSize = Number(brushSizeSlider.value);
  brushSize = Math.min(brushSize, maxBrushSize);
  brushSizeSlider.setAttribute('max', maxBrushSize);

  const brushSizeGridUnit = (brushSize * 2) + 1;
  brushSizeLabel.textContent = `Brush: ${brushSizeGridUnit} x ${brushSizeGridUnit}`;
}

function updateSizeLabel() {
  const sizeLabel = document.querySelector('.btn-size__label');

  size = Number(sizeSlider.value);
  sizeLabel.textContent = `Grid: ${size} x ${size}`;
}

function updateGridlines(e) {
  // Show or hide gridlines and update its ON/OFF label
  // If gridline button was clicked, toggle the setting, otherwise 
  // apply the current setting (ie. restore it upon resizing grid)
  const gridlinesText = document.querySelector('.btn-gridlines__status-text');

  if (e) hasGridlines = !hasGridlines;
  gridlinesText.textContent = (hasGridlines) ? 'ON' : 'OFF';

  for (const cell of grid.children) {
    if (hasGridlines) {
      cell.classList.add('grid__cell--gridlines');
    } else {
      cell.classList.remove('grid__cell--gridlines');
    }
  }
}

function undo() {
  const lastAction = historyUndo.pop();
  historyRedo = [...historyRedo, lastAction];
  
  lastAction.forEach(undoItem => {
    undoItem.div.style.backgroundColor = undoItem.oldColor;
  });
  
  enableButton(btnRedo);
  if (!historyUndo.length) disableButton(btnUndo);
}

function redo() {
  const lastAction = historyRedo.pop();
  historyUndo = [...historyUndo, lastAction];
  
  lastAction.forEach(redoItem => {
    redoItem.div.style.backgroundColor = redoItem.newColor;
  });

  enableButton(btnUndo);
  if (!historyRedo.length) disableButton(btnRedo);
}

function saveHistory() {
  // Empty temporary history buffer into master history after each brushstroke
  // Master history stores up to 25 entries
  // Ex: Painting 20 cells at once = stored as 1 entry, so undo/redo acts on all 20
  if (historyBuffer.length) {
    prevCenterCell = null;
    if (historyUndo.length >= 25) {
      historyUndo.shift();
    }
    historyUndo = [...historyUndo, [...historyBuffer]];
    historyBuffer = [];
  }
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
  const btmRightCell = document.querySelector(`.grid__cell:last-child`);
  const btmLeftCell = document.querySelector(`.grid__cell:nth-child(${size * size - size + 1})`);

  topLeftCell.classList.add('grid__cell--corner-top-left');
  topRightCell.classList.add('grid__cell--corner-top-right');
  btmRightCell.classList.add('grid__cell--corner-bottom-right');
  btmLeftCell.classList.add('grid__cell--corner-bottom-left');
}

function clampEdges(num) {
  // Used in getDrawArea and getOutlineArea to ensure borders are cropped at the
  // edges by restricting rows and columns to a value between 1 and grid size
  return Math.min(Math.max(num, 1), size);
}

function findCellByRowCol(row, col) {
  return cells.find(cellItem => cellItem.row === row && cellItem.col === col).div;
}