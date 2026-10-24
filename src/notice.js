import { App } from 'antd'

export function useNotice() {
  const { message } = App.useApp()
  return {
    ok(text) {
      message.success(text)
    },
    fail(text) {
      message.error(text)
    },
    info(text) {
      message.info(text)
    },
  }
}
