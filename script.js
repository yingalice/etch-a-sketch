'use strict'

const DEFAULT_MODE = 'color';
const DEFAULT_COLOR = '#505050';
const DEFAULT_SIZE = 16;
const DEFAULT_GRIDLINES = false;

let mode = DEFAULT_MODE;
let color = DEFAULT_COLOR;
let size = DEFAULT_SIZE;
let hasGridlines = DEFAULT_GRIDLINES;
let isMouseDown = false;

const modes = document.querySelector('.modes');
const btnClear = document.querySelector('.btn-clear');
const btnGridlines = document.querySelector('.btn-gridlines');
const colorPicker = document.querySelector('.btn-color__picker');
const sizeSlider = document.querySelector('.btn-size__slider');
const sizeLabel = document.querySelector('.btn-size__label');
const grid = document.querySelector('.grid');

modes.addEventListener('click', setMode);
btnClear.addEventListener('click', clearGrid);
btnGridlines.addEventListener('click', updateGridlines);
sizeSlider.addEventListener('input', updateSizeLabel);
sizeSlider.addEventListener('change', resizeGrid);
grid.addEventListener('mouseover', draw);
grid.addEventListener('mousedown', draw);
document.addEventListener('mousedown', () => isMouseDown = true);
document.addEventListener('mouseup', () => isMouseDown = false);
    
colorPicker.value = color;
sizeSlider.value = size;

setMode();
createGrid();

function setMode(e) {
  // Only 1 mode button can be selected (highlighted)
  // Starts with color button selected by default
  // Clicking color picker selects its parent button
  // Clicking any other non-button in the modes section is ignored
  let nearestButton = (e) ? e.target.closest('button[data-mode]') :
                      modes.querySelector(`button[data-mode="${mode}"]`);
  if (!nearestButton) return;
  mode = nearestButton.getAttribute('data-mode');
  
  const buttons = modes.querySelectorAll('button[data-mode]');
  for (const button of buttons) {
    button.classList.remove('btn--selected');                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
  }
  nearestButton.classList.add('btn--selected');
}

function createGrid() {
  // Remove existing square grid before creating new one
  while(grid.firstChild) {
    grid.removeChild(grid.lastChild);
  }

  grid.style.gridTemplate = `repeat(${size}, 1fr) / repeat(${size}, 1fr)`;
  for (let i = 1; i <= (size * size); i++) {
    const cell = document.createElement('div');
    cell.classList.add('grid__cell');
    grid.appendChild(cell);
  }

  updateSizeLabel();
  addRoundedCorners();
  updateGridlines();
}

function addRoundedCorners() {
  // Calculate corner cell position (changes with grid size)
  const topLeftCell = document.querySelector(`.grid__cell:first-child`);
  const topRightCell = document.querySelector(`.grid__cell:nth-child(${size})`);
  const btmLeftCell = document.querySelector(`.grid__cell:nth-child(${size * size - size + 1})`);
  const btmRightCell = document.querySelector(`.grid__cell:last-child`);

  topLeftCell.classList.add('grid__cell--top-left');
  topRightCell.classList.add('grid__cell--top-right');
  btmLeftCell.classList.add('grid__cell--bottom-left');
  btmRightCell.classList.add('grid__cell--bottom-right');
}

function getRandomColor() {
  // Generate random color in RGB format
  // Each of the 3 colors ranges from 0 to 255
  let rgbArr = [];
  for (let i = 0; i < 3; i++) {
    rgbArr.push(Math.floor(Math.random() * 256));
  }
  return `rgb(${rgbArr})`;
}

function getShadingColor(cell, increment) {
  // To lighten or darken cell, add or subtract same number from each RGB value
  // Each of the 3 colors ranges from 0 to 211
  const min = 0;    // Darkest = black RGB(0, 0, 0)
  const max = 211;  // Lightest = lightgray grid background RGB(211, 211, 211)
  const currentColor = getComputedStyle(cell).backgroundColor;
  const rgbArr = currentColor.slice(4, currentColor.length - 1).replace(/ /g, '').split(',');

  rgbArr.forEach((color, i, arr) => {
    color = parseInt(color) + increment;
    arr[i] = Math.min(Math.max(color, min), max);
  });

  return `rgb(${rgbArr})`;
}

function draw(e) {
  // Color cells according to selected mode
  if (e.type === 'mouseover' && !isMouseDown) return;

  color = (mode === 'color') ? colorPicker.value :
          (mode === 'random') ? getRandomColor() :
          (mode === 'darken') ? getShadingColor(e.target, -20) :
          (mode === 'lighten') ? getShadingColor(e.target, 20) :
          '';

  e.target.style.backgroundColor = color;
}

function clearGrid() {
  for (const cell of grid.children) {
    cell.style.backgroundColor = '';
  }
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

function resizeGrid(e) {
  size = e.target.value;
  clearGrid();
  createGrid();
}

function updateSizeLabel(e) {
  if (e) size = e.target.value;
  sizeLabel.textContent = `${size} x ${size}`;
}