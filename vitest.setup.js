// Ensure jsdom localStorage is available
import { JSDOM } from 'jsdom'

if (typeof global !== 'undefined' && !global.localStorage) {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
  })
  global.localStorage = dom.window.localStorage
  global.document = dom.window.document
  global.window = dom.window
  global.URL = dom.window.URL
}
