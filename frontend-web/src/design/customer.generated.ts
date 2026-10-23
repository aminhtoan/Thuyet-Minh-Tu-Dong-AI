// Generated; edit design/customer/tokens.json.
export const customerBrand = {
  "name": "Thuyết minh bảo tàng",
  "tagline": "NỀN TẢNG ĐA NGÔN NGỮ",
  "icon": "museum"
} as const;
export const componentRules = {
  "button": {
    "minTouchTarget": 44
  },
  "input": {
    "minHeight": 46
  },
  "card": {
    "radius": "lg"
  },
  "badge": {
    "interactive": false
  }
} as const;
export const feedbackRules = {
  "loading": "Đang tải",
  "empty": "Chưa có dữ liệu",
  "error": "Không thể tải dữ liệu",
  "success": "Đã lưu thay đổi",
  "rules": [
    "Loading is not empty",
    "Error is not empty",
    "Only server-confirmed success",
    "UNCERTAIN never authorizes retry",
    "Preserve screen-specific safety messages"
  ]
} as const;
