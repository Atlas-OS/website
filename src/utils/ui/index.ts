/**
 * UI utilities for interactive components.
 *
 * This module provides client-side functionality for:
 * - Sidebar toggle and interactions
 * - Mobile menu
 * - Header scroll effects
 *
 * @example
 * import { initSidebar, initNavbar } from '@/utils/ui';
 *
 * // On page load
 * initNavbar(); // For all pages
 * initSidebar(); // For docs pages with sidebar
 *
 * @module ui
 */

export { initSidebar, closeSidebar } from './sidebar';
export { initNavbar } from './navbar';
