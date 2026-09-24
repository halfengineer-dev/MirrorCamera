import React from 'react';
import { View, StyleSheet } from 'react-native';

export type FramingMode = 'off' | 'portrait' | 'fullbody' | 'outfit';

interface Props {
  mode: FramingMode;
}

export const FramingGuides: React.FC<Props> = ({ mode }) => {
  if (mode === 'off') return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {mode === 'portrait' && (
        <View style={styles.portraitContainer}>
          <View style={styles.portraitHead} />
          <View style={styles.portraitShoulders} />
        </View>
      )}
      
      {mode === 'fullbody' && (
        <View style={styles.fullBodyContainer}>
          <View style={styles.fullBodyOutline} />
        </View>
      )}

      {mode === 'outfit' && (
        <View style={styles.outfitContainer}>
          <View style={styles.outfitTop} />
          <View style={styles.outfitBottom} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  portraitContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  portraitHead: {
    width: 140,
    height: 180,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    borderStyle: 'dashed',
  },
  portraitShoulders: {
    width: 280,
    height: 150,
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.4)',
    borderStyle: 'dashed',
    marginTop: 20,
  },
  fullBodyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  fullBodyOutline: {
    width: '60%',
    height: '80%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    borderStyle: 'dashed',
    borderRadius: 40,
  },
  outfitContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 120,
    gap: 20,
  },
  outfitTop: {
    width: '50%',
    height: '40%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    borderStyle: 'dashed',
    borderRadius: 20,
  },
  outfitBottom: {
    width: '45%',
    height: '40%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    borderStyle: 'dashed',
    borderRadius: 10,
  }
});
