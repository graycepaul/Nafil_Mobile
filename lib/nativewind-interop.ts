import { SectionList } from 'react-native';
import { remapProps } from 'nativewind';

/**
 * NativeWind registers className/contentContainerClassName support for
 * FlatList and VirtualizedList out of the box, but never for SectionList -
 * grep node_modules/react-native-css-interop/dist/runtime/components.js and
 * it's simply absent from the list. Every `<SectionList className="..."
 * contentContainerClassName="...">` in this app (Issues, Announcements,
 * Visitors, Visit history) was silently getting zero styling from those
 * props - not a typo or a specificity fight, the props were never being
 * translated to actual styles at all. This teaches NativeWind about
 * SectionList the same way it already knows FlatList, so existing
 * className usage across the app just starts working instead of needing
 * every call site converted to inline style props.
 *
 * Must be imported before any SectionList renders - done once at the top
 * of the root layout, alongside the global.css import.
 */
remapProps(SectionList, {
  className: 'style',
  contentContainerClassName: 'contentContainerStyle',
  ListHeaderComponentClassName: 'ListHeaderComponentStyle',
  ListFooterComponentClassName: 'ListFooterComponentStyle',
});
