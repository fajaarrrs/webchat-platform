import { useEffect, useState } from 'react';

const MOBILE_MAX = 767;
const TABLET_MAX = 1023;

function getWindowWidth() {
  if (typeof window === 'undefined') return TABLET_MAX + 1;
  return window.innerWidth;
}

export default function useBreakpoint() {
  const [width, setWidth] = useState(getWindowWidth);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return {
    width,
    isMobile: width <= MOBILE_MAX,
    isTablet: width > MOBILE_MAX && width <= TABLET_MAX,
    isDesktop: width > TABLET_MAX,
  };
}
