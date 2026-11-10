// src/utils/rockImages.js

export const getLocalBlockImage = (rock) => {
  const rawName = typeof rock === 'string'
    ? rock
    : `${rock?.name || ''} ${rock?.scientificName || ''}`;

  const name = rawName.toLowerCase();

  if (name.includes('basalt')) {
    return require('../../assets/blocks/basalto.png');
  }
  if (name.includes('granit') || name.includes('diorit') || name.includes('andesit')) {
    return require('../../assets/blocks/granito.png');
  }
  if (name.includes('arenisca') || name.includes('sandstone') || name.includes('caliza') || name.includes('limestone')) {
    return require('../../assets/blocks/arenisca.png');
  }
  if (name.includes('pizarra') || name.includes('slate') || name.includes('obsidian') || name.includes('gneis') || name.includes('marmol') || name.includes('mármol')) {
    return require('../../assets/blocks/pizarra.png');
  }

  // Fallback seguro si no coincide con ninguna
  return require('../../assets/blocks/pizarra.png');
};