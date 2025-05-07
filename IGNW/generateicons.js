const fs = require('fs');

// SVG for Trophy Icon
const trophySVG = `
<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
  <rect width="24" height="24" fill="black"/>
  <path d="M7 7H5V4H19V7H17M12 4V12M9 12H15L14 17H10L9 12Z" stroke="aqua" stroke-width="1.5" fill="none"/>
</svg>`;

// SVG for Star Icon
const starSVG = `
<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
  <rect width="24" height="24" fill="black"/>
  <path d="M12 2L15 9H22L16 14L18 21L12 17L6 21L8 14L2 9H9L12 2Z" stroke="aqua" stroke-width="1.5" fill="none"/>
</svg>`;

// SVG for Person Icon
const personSVG = `
<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
  <rect width="24" height="24" fill="black"/>
  <path d="M12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 13C14.21 13 16 14.79 16 17V19H8V17C8 14.79 9.79 13 12 13Z" stroke="aqua" stroke-width="1.5" fill="none"/>
</svg>`;

// Write SVGs to files
fs.writeFileSync('trophy.svg', trophySVG.trim());
fs.writeFileSync('star.svg', starSVG.trim());
fs.writeFileSync('person.svg', personSVG.trim());

console.log('SVG icons generated: trophy.svg, star.svg, person.svg');