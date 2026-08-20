import { UAParser } from 'ua-parser-js'

import { Stats } from '../../models/stats.js'
import { logger } from '../../utils/logger.js'
import { textPayload } from '../../utils/response.js'

export const statsService = {
  recordVisit({ ip, userAgent, referrer }: { ip?: string; userAgent?: string; referrer?: string }) {
    try {
      const parser = new UAParser(userAgent)
      const result = parser.getResult()

      Stats.recordVisit({
        ip,
        os: result.os.name || 'Unknown',
        browser: result.browser.name || 'Unknown',
        referrer
      })

      return textPayload('OK')
    } catch (error) {
      logger.error('Record visit error:', error)
      return textPayload('Error')
    }
  }
}
