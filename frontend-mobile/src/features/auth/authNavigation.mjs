export const authRouteGuards = Object.freeze({
  loading: Object.freeze({ loading: true, public: false, private: false }),
  unauthenticated: Object.freeze({ loading: false, public: true, private: false }),
  authenticated: Object.freeze({ loading: false, public: false, private: true }),
});
