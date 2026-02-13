const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const width = 1200;
const height = 630;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#0A0A0A';
ctx.fillRect(0, 0, width, height);

// Decorative circles (left)
ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.arc(150, 315, 80, 0, Math.PI * 2);
ctx.stroke();

ctx.strokeStyle = 'rgba(212, 175, 55, 0.1)';
ctx.lineWidth = 1;
ctx.beginPath();
ctx.arc(150, 315, 120, 0, Math.PI * 2);
ctx.stroke();

// Decorative circles (right)
ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.arc(1050, 315, 80, 0, Math.PI * 2);
ctx.stroke();

ctx.strokeStyle = 'rgba(212, 175, 55, 0.1)';
ctx.lineWidth = 1;
ctx.beginPath();
ctx.arc(1050, 315, 120, 0, Math.PI * 2);
ctx.stroke();

// Trophy emoji (using text)
ctx.font = '80px Arial';
ctx.textAlign = 'center';
ctx.fillText('🏆', 600, 180);

// Gold gradient for text
const gradient = ctx.createLinearGradient(300, 250, 900, 350);
gradient.addColorStop(0, '#F4D03F');
gradient.addColorStop(0.5, '#D4AF37');
gradient.addColorStop(1, '#B8962E');

// Main title "ShapeU"
ctx.font = 'bold 120px Arial Black, Arial, sans-serif';
ctx.textAlign = 'center';
ctx.fillStyle = gradient;
ctx.fillText('ShapeU', 600, 340);

// Tagline
ctx.font = '36px Arial, sans-serif';
ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
ctx.fillText('Molde o seu futuro', 600, 420);

// Bottom decorative line
const lineGradient = ctx.createLinearGradient(450, 480, 750, 480);
lineGradient.addColorStop(0, '#F4D03F');
lineGradient.addColorStop(0.5, '#D4AF37');
lineGradient.addColorStop(1, '#B8962E');
ctx.fillStyle = lineGradient;
ctx.globalAlpha = 0.6;
ctx.fillRect(450, 478, 300, 3);
ctx.globalAlpha = 1;

// Small stars
ctx.font = '20px Arial';
ctx.fillStyle = 'rgba(212, 175, 55, 0.5)';
ctx.fillText('✦', 420, 490);
ctx.fillText('✦', 780, 490);

// Save the image
const outputPath = path.join(__dirname, '..', 'public', 'assets', 'og-image.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outputPath, buffer);

console.log('OG image generated successfully at:', outputPath);
