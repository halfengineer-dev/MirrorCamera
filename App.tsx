import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { Colors } from './src/constants/Colors';
import { CameraScreen } from './src/screens/CameraScreen';
import { PermissionScreen } from './src/screens/PermissionScreen';

const App = () => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!hasPermission) {
    return <PermissionScreen onRequestPermission={requestPermission} />;
  }

  return (
    <View style={styles.container}>
      <CameraScreen />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});

export default App;
