export type {
  NavItem,
  SectionNavItem,
  DocsEntry,
  BuildNavigationOptions,
  PageNavLink,
  PrevNextPages,
} from './types';

export {
  normalizeSlug,
  addDocsPrefix,
  removeDocsPrefix,
  getSlugFromId,
  getSlugFromEntry,
  getSectionFromSlug,
  getSectionLabelFromSlug,
  isActivePage,
  normalizeSlugForDisplay,
  clearSlugCache,
} from './slugs';

export { buildNavigationTree, getPageTitle } from './tree-builder';

export { getPrevNextPages } from './pagination';

export {
  sortSectionsByPriority,
  normalizeNavItemsForDisplay,
  filterDuplicateItems,
  prepareSidebarNavigation,
  shouldSkipItem,
} from './sidebar';
