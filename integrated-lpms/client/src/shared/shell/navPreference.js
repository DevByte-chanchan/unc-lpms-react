const KEY = 'lpms_nav_collapsed';

export const readCollapsed = (storage) => {
  try {
    return storage?.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

export const writeCollapsed = (storage, collapsed) => {
  try {
    storage?.setItem(KEY, collapsed ? '1' : '0');
  } catch {
    // ignore storage errors
  }
};
