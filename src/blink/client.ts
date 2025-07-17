import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: 'smart-receipt-price-scanner-0bxcak6p',
  authRequired: true
})

export default blink