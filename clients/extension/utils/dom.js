export const escapeHtml = (value) => {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export const fillSelectOptions = (selectElement, options, { placeholder } = {}) => {
  if (!selectElement) {
    return
  }

  selectElement.replaceChildren()

  if (placeholder) {
    const placeholderOption = document.createElement('option')
    placeholderOption.value = ''
    placeholderOption.textContent = placeholder
    selectElement.appendChild(placeholderOption)
  }

  for (const option of options) {
    const node = document.createElement('option')
    node.value = String(option.value ?? '')
    node.textContent = String(option.label ?? '')
    selectElement.appendChild(node)
  }
}
