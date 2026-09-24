import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import RNPhotoManipulator, { FlipMode } from 'react-native-photo-manipulator';
import { Platform } from 'react-native';

export const processAndSaveMirroredImage = async (imagePath: string): Promise<string> => {
  try {
    const formattedPath = !imagePath.startsWith('file://') ? `file://${imagePath}` : imagePath;
    
    // Flip the image horizontally natively.
    // RNPhotoManipulator guarantees high quality output.
    const flippedImagePath = await RNPhotoManipulator.flipImage(formattedPath, FlipMode.Horizontal);
    
    const finalPathToSave = !flippedImagePath.startsWith('file://') ? `file://${flippedImagePath}` : flippedImagePath;

    // Save the flipped image to the device gallery
    await CameraRoll.save(finalPathToSave, { type: 'photo' });
    
    return flippedImagePath;
  } catch (error) {
    console.error('Failed to process and save mirrored image:', error);
    throw error;
  }
};
