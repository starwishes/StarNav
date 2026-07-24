import { onMounted, onUnmounted } from 'vue'

/**
 * 懒加载图片 Hook
 * 使用 IntersectionObserver 实现图片懒加载，减少初始加载时间
 *
 * @param selector - 图片选择器（默认 'img[data-src]'）
 * @param options - IntersectionObserver 配置项
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

  const initObserver = () => {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadImage(entry)
        }
      })
    }, options)

    const images = document.querySelectorAll(selector)
    images.forEach((img) => observer?.observe(img))
  }

  onMounted(() => {
    initObserver()
  })

  onUnmounted(() => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  })

  return {
    reinit: initObserver
  }
}
