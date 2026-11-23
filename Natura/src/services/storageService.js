export const saveUserName = (name) => {
  try {
    sessionStorage.setItem('natura_userName', name);
  } catch (e) {
    console.warn('Could not save user name to sessionStorage', e);
  }
}

export const loadUserName = () => {
  try {
    return sessionStorage.getItem('natura_userName') || null;
  } catch (e) {
    console.warn('Could not read user name from sessionStorage', e);
    return null;
  }
}

export const saveLastCategory = (categoryKey) => {
  try {
    sessionStorage.setItem('natura_lastCategory', categoryKey);
  } catch (e) {
    console.warn('Could not save last category to sessionStorage', e);
  }
}

export const loadLastCategory = () => {
  try {
    return sessionStorage.getItem('natura_lastCategory') || null;
  } catch (e) {
    console.warn('Could not read last category from sessionStorage', e);
    return null;
  }
}

export const clearUserName = () => {
  try {
    sessionStorage.removeItem('natura_userName');
  } catch (e) {
    console.warn('Could not remove user name from sessionStorage', e);
  }
}
