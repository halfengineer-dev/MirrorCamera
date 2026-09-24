import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/Colors';

interface ShutterButtonProps {
  onPress: () => void;
  onLongPress?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
}

export const ShutterButton: React.FC<ShutterButtonProps> = ({ onPress, onLongPress, onPressOut, disabled }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.outerCircle, disabled && styles.disabled]}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressOut={onPressOut}
      disabled={disabled}
      delayLongPress={300}
    >
      <View style={styles.innerCircle} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  outerCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: Colors.shutter,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  innerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.shutterInner,
  },
  disabled: {
    opacity: 0.5,
  },
});
