import { onMounted, onUnmounted } from 'vue'

/**
 * Lazy-load images via IntersectionObserver.
 * Also watches the document for newly inserted matching nodes (SPA list updates).
 *
 * @param selector - Image selector (default `img[data-src]`)
 * @param options - IntersectionObserver options
 */
export function useLazyLoad(
  selector = 'img[data-src]',
  options: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.01
  }
) {
  let observer: IntersectionObserver | null = null
  let mutationObserver: MutationObserver | null = null

  const loadImage = (entry: IntersectionObserverEntry) => {
    const img = entry.target as HTMLImageElement
    const src = img.dataset.src

    if (src) {
      img.src = src
      img.removeAttribute('data-src')
      if (observer) {
        observer.unobserve(img)
      }
    }
  }

  const observeMatching = (root: ParentNode = document) => {
    if (!observer) {
      return
    }
    const images = root.querySelectorAll(selector)
    images.forEach((img) => observer?.observe(img))
  }

  const initObserver = () => {
    if (observer) {
      observer.disconnect()
    }
    if (mutationObserver) {
      mutationObserver.disconnect()
    }

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadImage(entry)
        }
      })
    }, options)

    observeMatching(document)

    if (typeof MutationObserver === 'function') {
      mutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) {
              return
            }
            if (node.matches?.(selector)) {
              observer?.observe(node)
            }
            observeMatching(node)
          })
        }
      })
      mutationObserver.observe(document.body, { childList: true, subtree: true })
    }
  }

  onMounted(() => {
    initObserver()
  })

  onUnmounted(() => {
    if (mutationObserver) {
      mutationObserver.disconnect()
      mutationObserver = null
    }
    if (observer) {
      observer.disconnect()
      observer = null
    }
  })

  return {
    reinit: initObserver
  }
}
