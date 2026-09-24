import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Alert, TouchableOpacity, Image, SafeAreaView, Modal, Share, ScrollView, Switch, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Camera, useCameraDevice, usePhotoOutput } from 'react-native-vision-camera';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { Zap, ChevronDown, Scan, Settings, RefreshCcw, ChevronLeft, Crop, Trash2, Share as ShareIcon } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { ShutterButton } from '../components/ShutterButton';
import { FramingGuides, FramingMode } from '../components/FramingGuides';
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
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [mode, setMode] = useState<'Photo' | 'Video'>('Photo');
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [mirrorPreview, setMirrorPreview] = useState(true);
  const [mirrorPhotos, setMirrorPhotos] = useState(true);
  const [burstMode, setBurstMode] = useState(false);
  const [framingMode, setFramingMode] = useState<FramingMode>('off');
  const burstIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;
  
  // Phase 2 State
  const [timerMode, setTimerMode] = useState<0 | 3 | 5 | 10>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [reviewMode, setReviewMode] = useState<'mirrored' | 'original'>('mirrored');
  const [tempPhotoPath, setTempPhotoPath] = useState<string | null>(null);
  
  const photoOutput = usePhotoOutput();

  const toggleTimer = useCallback(() => {
    ReactNativeHapticFeedback.trigger("impactLight");
    setTimerMode(t => t === 0 ? 3 : t === 3 ? 5 : t === 5 ? 10 : 0);
  }, []);

  const selectLens = useCallback((zoomFactor: number) => {
    ReactNativeHapticFeedback.trigger("selection");
    setZoom(zoomFactor);
  }, []);

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const preview = await AsyncStorage.getItem('mirrorPreview');
        const photos = await AsyncStorage.getItem('mirrorPhotos');
        const burst = await AsyncStorage.getItem('burstMode');
        const framing = await AsyncStorage.getItem('framingMode');
        if (preview !== null) setMirrorPreview(preview === 'true');
        if (photos !== null) setMirrorPhotos(photos === 'true');
        if (burst !== null) setBurstMode(burst === 'true');
        if (framing !== null) setFramingMode(framing as FramingMode);
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    };
    loadSettings();
  }, []);

  const toggleBurstMode = async (value: boolean) => {
    setBurstMode(value);
    await AsyncStorage.setItem('burstMode', value.toString());
  };

  const cycleFramingMode = async () => {
    const nextMode = framingMode === 'off' ? 'portrait' : framingMode === 'portrait' ? 'fullbody' : framingMode === 'fullbody' ? 'outfit' : 'off';
    setFramingMode(nextMode);
    await AsyncStorage.setItem('framingMode', nextMode);
    ReactNativeHapticFeedback.trigger("selection");
  };

  const toggleMirrorPreview = async (value: boolean) => {
    setMirrorPreview(value);
    await AsyncStorage.setItem('mirrorPreview', value.toString());
  };

  const toggleMirrorPhotos = async (value: boolean) => {
    setMirrorPhotos(value);
    await AsyncStorage.setItem('mirrorPhotos', value.toString());
  };


  const executeCapture = useCallback(async () => {
    try {
      setIsCapturing(true);
      ReactNativeHapticFeedback.trigger("impactMedium");
      
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 150, useNativeDriver: true })
      ]).start();

      const photoFile = await photoOutput.capturePhotoToFile({
        flashMode: flash,
      }, {});

      const formattedPath = !photoFile.filePath.startsWith('file://') ? `file://${photoFile.filePath}` : photoFile.filePath;

      // Do NOT save to CameraRoll yet. Just store temporarily and open Preview.
      setTempPhotoPath(formattedPath);
      setReviewMode(mirrorPhotos ? 'mirrored' : 'original');
      setIsPreviewVisible(true);
      ReactNativeHapticFeedback.trigger("notificationSuccess");

    } catch (error) {
      console.error('Capture failed:', error);
      Alert.alert('Capture Error', 'Failed to capture photo.');
      ReactNativeHapticFeedback.trigger("notificationError");
    } finally {
      setIsCapturing(false);
    }
  }, [flash, mirrorPhotos, photoOutput]);

  const handleCapture = useCallback(async () => {
    if (isCapturing || mode !== 'Photo') return;

    if (timerMode > 0) {
      setCountdown(timerMode);
      ReactNativeHapticFeedback.trigger("notificationWarning");
      let timeLeft = timerMode;
      const interval = setInterval(() => {
        timeLeft -= 1;
        if (timeLeft > 0) {
          setCountdown(timeLeft);
          ReactNativeHapticFeedback.trigger("impactLight");
        } else {
          clearInterval(interval);
          setCountdown(null);
          executeCapture();
        }
      }, 1000);
    } else {
      executeCapture();
    }
  }, [timerMode, isCapturing, mode, executeCapture]);

  const handleLongPress = useCallback(() => {
    if (!burstMode || mode !== 'Photo') return;
    // Fire burst rapidly
    burstIntervalRef.current = setInterval(() => {
      executeCapture();
    }, 500);
    ReactNativeHapticFeedback.trigger("notificationWarning");
  }, [burstMode, mode, executeCapture]);

  const handlePressOut = useCallback(() => {
    if (burstIntervalRef.current) {
      clearInterval(burstIntervalRef.current);
      burstIntervalRef.current = null;
    }
  }, []);

  const toggleFlash = useCallback(() => {
    ReactNativeHapticFeedback.trigger("impactLight");
    setFlash(f => f === 'off' ? 'on' : f === 'on' ? 'auto' : 'off');
  }, []);

  const toggleCamera = useCallback(() => {
    ReactNativeHapticFeedback.trigger("impactMedium");
    setCameraPosition(p => (p === 'back' ? 'front' : 'back'));
  }, []);

  const handleSavePhoto = useCallback(async () => {
    if (!tempPhotoPath) return;
    try {
      if (reviewMode === 'mirrored') {
        const savedPath = await processAndSaveMirroredImage(tempPhotoPath);
        setCapturedThumbnail(savedPath);
      } else {
        await CameraRoll.save(tempPhotoPath, { type: 'photo' });
        setCapturedThumbnail(tempPhotoPath);
      }
      ReactNativeHapticFeedback.trigger("notificationSuccess");
      setIsPreviewVisible(false);
    } catch (error) {
      console.error('Save failed:', error);
      Alert.alert('Error', 'Failed to save photo.');
      ReactNativeHapticFeedback.trigger("notificationError");
    }
  }, [tempPhotoPath, reviewMode]);

  const handleRetake = useCallback(() => {
    setTempPhotoPath(null);
    setIsPreviewVisible(false);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!capturedThumbnail) return;
    try {
      await CameraRoll.deletePhotos([capturedThumbnail]);
      setCapturedThumbnail(null);
      setIsPreviewVisible(false);
      ReactNativeHapticFeedback.trigger("notificationSuccess");
    } catch (error) {
      console.error('Failed to delete photo:', error);
      Alert.alert('Error', 'Failed to delete photo.');
    }
  }, [capturedThumbnail]);

  const handleCrop = useCallback(async () => {
    Alert.alert('Crop Unvailable', 'The native crop module is fully broken on React Native 0.76. We need to install a JS-based alternative like react-native-image-crop-tools if you want cropping!');
  }, []);

  const handleShare = useCallback(async () => {
    if (!capturedThumbnail) return;
    try {
      await Share.share({
        url: capturedThumbnail,
      });
    } catch (error: any) {
      console.error('Failed to share photo:', error);
    }
  }, [capturedThumbnail]);

  if (device == null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill}>
        <Camera
          ref={camera}
          style={[StyleSheet.absoluteFill, mirrorPreview && { transform: [{ scaleX: -1 }] }]}
          device={device}
          isActive={true}
          outputs={[photoOutput]}
          zoom={zoom}
          onError={(e) => console.error('Camera Error:', e)}
        />
        
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFF', opacity: flashAnim }]} pointerEvents="none" />
        
        <FramingGuides mode={framingMode} />
        
        {countdown !== null && (
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        )}
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.flashButton} onPress={toggleFlash}>
            <Zap size={20} color={Colors.text} fill={flash !== 'off' ? Colors.text : 'none'} />
            <ChevronDown size={16} color={Colors.text} style={styles.chevron} />
          </TouchableOpacity>
          
          <View style={styles.topRightControls}>
            <TouchableOpacity style={styles.iconButton} onPress={toggleTimer}>
              <Text style={styles.timerText}>{timerMode === 0 ? 'OFF' : `${timerMode}s`}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={cycleFramingMode}>
              <Scan size={22} color={framingMode === 'off' ? Colors.text : Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => setIsSettingsVisible(true)}>
              <Settings size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.lensSelectorContainer}>
        {[0.5, 1, 2].map((zoomFactor) => (
          <TouchableOpacity 
            key={zoomFactor}
            style={[styles.lensButton, zoom === zoomFactor && styles.lensButtonActive]}
            onPress={() => selectLens(zoomFactor)}
          >
            <Text style={[styles.lensText, zoom === zoomFactor && styles.lensTextActive]}>
              {zoomFactor}x
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
          <TouchableOpacity 
            style={styles.thumbnailContainer} 
            onPress={() => {
              if (capturedThumbnail) {
                setTempPhotoPath(capturedThumbnail);
                setReviewMode('original'); // existing gallery photos don't need real-time flipping
                setIsPreviewVisible(true);
              }
            }}
            activeOpacity={0.7}
          >
            {capturedThumbnail ? (
              <Image source={{ uri: capturedThumbnail }} style={styles.thumbnailImage} />
            ) : (
              <View style={styles.thumbnailEmpty} />
            )}
          </TouchableOpacity>

          <ShutterButton 
            onPress={handleCapture} 
            onLongPress={handleLongPress} 
            onPressOut={handlePressOut}
            disabled={isCapturing && !burstIntervalRef.current} 
          />

          <TouchableOpacity style={styles.flipButton} onPress={toggleCamera}>
            <RefreshCcw size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={isPreviewVisible} transparent={false} animationType="fade">
        <SafeAreaView style={styles.previewContainer}>
          {/* Top Bar */}
          <View style={styles.previewTopBar}>
            <TouchableOpacity style={styles.previewHeaderButton} onPress={handleRetake}>
              <ChevronLeft size={28} color="#FFF" />
              <Text style={styles.previewHeaderText}>Retake</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSavePhoto}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Image Viewer with Pinch to Zoom */}
          <ScrollView 
            style={styles.previewScrollView}
            contentContainerStyle={styles.previewImageContainer}
            maximumZoomScale={5}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            {tempPhotoPath && (
              <Image 
                source={{ uri: tempPhotoPath }} 
                style={[
                  styles.fullScreenImage, 
                  reviewMode === 'mirrored' && { transform: [{ scaleX: -1 }] }
                ]} 
                resizeMode="contain" 
              />
            )}
          </ScrollView>

          {/* Bottom Bar: Original vs Mirrored Toggle */}
          <View style={styles.reviewToggleContainer}>
            <TouchableOpacity 
              style={[styles.reviewTab, reviewMode === 'original' && styles.reviewTabActive]}
              onPress={() => {
                ReactNativeHapticFeedback.trigger("selection");
                setReviewMode('original');
              }}
            >
              <Text style={[styles.reviewTabText, reviewMode === 'original' && styles.reviewTabTextActive]}>Original</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.reviewTab, reviewMode === 'mirrored' && styles.reviewTabActive]}
              onPress={() => {
                ReactNativeHapticFeedback.trigger("selection");
                setReviewMode('mirrored');
              }}
            >
              <Text style={[styles.reviewTabText, reviewMode === 'mirrored' && styles.reviewTabTextActive]}>Mirrored</Text>
            </TouchableOpacity>
          </View>

          {/* Actions Bar */}
          <View style={styles.previewBottomBar}>
            <TouchableOpacity style={styles.previewIconButton} onPress={handleShare}>
              <ShareIcon size={24} color="#FFF" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.previewIconButton} onPress={handleCrop}>
              <Crop size={24} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.previewIconButton} onPress={handleDelete}>
              <Trash2 size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={isSettingsVisible} transparent={false} animationType="slide">
        <SafeAreaView style={styles.settingsContainer}>
          <View style={styles.settingsTopBar}>
            <TouchableOpacity style={styles.previewHeaderButton} onPress={() => setIsSettingsVisible(false)}>
              <ChevronLeft size={28} color="#FFF" />
              <Text style={styles.previewHeaderText}>Settings</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsSectionTitle}>Camera</Text>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingText}>Mirror Preview</Text>
              <Switch 
                value={mirrorPreview} 
                onValueChange={toggleMirrorPreview}
                trackColor={{ false: '#3e3e3e', true: Colors.primary }}
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingText}>Mirror Photos</Text>
              <Switch 
                value={mirrorPhotos} 
                onValueChange={toggleMirrorPhotos}
                trackColor={{ false: '#3e3e3e', true: Colors.primary }}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingText}>Burst Mode</Text>
              <Switch 
                value={burstMode} 
                onValueChange={toggleBurstMode}
                trackColor={{ false: '#3e3e3e', true: Colors.primary }}
              />
            </View>

            <Text style={styles.settingsDescription}>
              When enabled, the preview and saved photos will be horizontally flipped like a true physical mirror. Hold shutter for Burst mode.
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
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
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previewHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewHeaderText: {
    color: '#FFF',
    fontSize: 17,
    marginLeft: 4,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
  },
  reviewToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 16,
  },
  reviewTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#222',
  },
  reviewTabActive: {
    backgroundColor: '#444',
  },
  reviewTabText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '600',
  },
  reviewTabTextActive: {
    color: '#FFF',
  },
  previewScrollView: {
    flex: 1,
  },
  previewImageContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  previewBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  previewIconButton: {
    padding: 12,
  },
  settingsContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  settingsTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  settingsContent: {
    padding: 24,
  },
  settingsSectionTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  settingText: {
    color: '#FFF',
    fontSize: 17,
  },
  settingsDescription: {
    color: '#666',
    fontSize: 13,
    marginTop: 24,
    lineHeight: 18,
  },
  timerText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: 'bold',
  },
  countdownContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  countdownText: {
    fontSize: 120,
    fontWeight: 'bold',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  lensSelectorContainer: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  lensButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  lensButtonActive: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderColor: Colors.primary,
  },
  lensText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  lensTextActive: {
    color: Colors.primary,
  },
});
