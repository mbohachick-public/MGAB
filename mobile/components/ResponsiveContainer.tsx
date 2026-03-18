import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

const MAX_CONTENT_WIDTH = 800;

type ResponsiveContainerProps = {
  children: React.ReactNode;
};

/**
 * Wraps content with responsive layout. On web, constrains max-width and centers
 * for a readable desktop experience. On native, passes through unchanged.
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({ children }) => {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.webRoot}>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  webRoot: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
});
