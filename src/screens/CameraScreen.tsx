import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Alert, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { Camera, useCameraDevice, usePhotoOutput } from 'react-native-vision-camera';
import { Zap, ChevronDown, Scan, Settings, RefreshCcw } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { ShutterButton } from '../components/ShutterButton';
import { processAndSaveMirroredImage } from '../services/ImageProcessor';
import { FlashMode } from '../types/CameraTypes';

export const CameraScreen = () => {
  const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>('back');
  const device = useCameraDevice(cameraPosition);
  const camera = useRef<Camera>(null);
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState<FlashMode>('auto');
  const [zoom, setZoom] = useState<number>(1);
  const [capturedThumbnail, setCapturedThumbnail] = useState<string | null>(null);
  const [mode, setMode] = useState<'Photo' | 'Video'>('Photo');
  const photoOutput = usePhotoOutput();


  const handleCapture = useCallback(async () => {
    if (isCapturing || mode !== 'Photo') return;

    try {
      setIsCapturing(true);
      
      const photoFile = await photoOutput.capturePhotoToFile({
        flashMode: flash,
      }, {});

      processAndSaveMirroredImage(photoFile.filePath)
        .then(savedPath => {
          setCapturedThumbnail(savedPath);
        })
        .catch(err => {
          Alert.alert('Save Failed', 'Failed to save the mirrored photo.');
        });

    } catch (error) {
      console.error('Capture failed:', error);
      Alert.alert('Capture Error', 'Failed to capture photo.');
    } finally {
      setIsCapturing(false);
    }
  }, [flash, isCapturing, mode]);

  const toggleFlash = useCallback(() => {
    setFlash(f => f === 'off' ? 'on' : f === 'on' ? 'auto' : 'off');
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraPosition(p => (p === 'back' ? 'front' : 'back'));
  }, []);

  if (device == null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[StyleSheet.absoluteFill, cameraPosition === 'back' && styles.mirroredContainer]}>
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          outputs={[photoOutput]}
          zoom={zoom}
          onError={(e) => console.error('Camera Error:', e)}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.flashButton} onPress={toggleFlash}>
            <Zap size={20} color={Colors.text} fill={flash !== 'off' ? Colors.text : 'none'} />
            <ChevronDown size={16} color={Colors.text} style={styles.chevron} />
          </TouchableOpacity>
          
          <View style={styles.topRightControls}>
            <TouchableOpacity style={styles.iconButton}>
              <Scan size={22} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Settings size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.bottomPanel}>
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity 
            style={[styles.modeButton, mode === 'Photo' && styles.modeButtonActive]}
            onPress={() => setMode('Photo')}
          >
            <Text style={[styles.modeText, mode === 'Photo' && styles.modeTextActive]}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modeButton, mode === 'Video' && styles.modeButtonActive]}
            onPress={() => setMode('Video')}
          >
            <Text style={[styles.modeText, mode === 'Video' && styles.modeTextActive]}>Video</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomControls}>
          <TouchableOpacity style={styles.thumbnailContainer}>
            {capturedThumbnail ? (
              <Image source={{ uri: capturedThumbnail }} style={styles.thumbnailImage} />
            ) : (
              <View style={styles.thumbnailEmpty} />
            )}
          </TouchableOpacity>

          <ShutterButton onPress={handleCapture} disabled={isCapturing} />

          <TouchableOpacity style={styles.flipButton} onPress={toggleCamera}>
            <RefreshCcw size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  mirroredContainer: {
    transform: [{ scaleX: -1 }],
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  flashButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.overlay,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
  },
  chevron: {
    marginLeft: 8,
  },
  topRightControls: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    backgroundColor: Colors.overlay,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomPanel: {
    backgroundColor: Colors.bottomPanel,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingBottom: 48,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  modeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  modeButtonActive: {
    backgroundColor: Colors.activeTab,
  },
  modeText: {
    color: Colors.inactiveText,
    fontSize: 16,
    fontWeight: '500',
  },
  modeTextActive: {
    color: Colors.text,
    fontWeight: 'bold',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  thumbnailContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailEmpty: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.overlay,
  },
  flipButton: {
    backgroundColor: Colors.overlay,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
