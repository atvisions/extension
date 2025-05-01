// CSRF 令牌管理
const getCSRFToken = () => {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') : null;
};
 
export { getCSRFToken }; 