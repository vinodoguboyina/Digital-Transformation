// Fill the image panel with no empty bars and no extra zoom.
// Wide or huge files are scaled down to the panel and pinned to its right edge.
export function fitHeroImage(panelWidth, panelHeight, imageWidth, imageHeight) {
  if (!panelWidth || !panelHeight || !imageWidth || !imageHeight) {
    return null
  }

  const scale = Math.max(panelWidth / imageWidth, panelHeight / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale

  return {
    position: 'absolute',
    width: `${width}px`,
    height: `${height}px`,
    maxWidth: 'none',
    left: `${panelWidth - width}px`,
    top: `${(panelHeight - height) / 2}px`,
  }
}
