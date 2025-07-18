import React, { useEffect, useState, useRef } from "react";
import { View, Text, Button, StyleSheet, Alert } from "react-native";
import { Audio } from "expo-av";
import { ProgressBar } from "react-native-paper";

export default function App() {
  const [recording, setRecording] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isTurnedOff, setIsTurnedOff] = useState(false);
  const MAX_PROGRESS = 1;
  const BLOW_THRESHOLD = -30;
  const PROGRESS_INCREMENT = 0.01;
  const backgroundSoundRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (backgroundSoundRef.current) {
        backgroundSoundRef.current.stopAsync();
        backgroundSoundRef.current.unloadAsync();
      }
    };
  }, [recording]);

  const startRecording = async () => {
    try {
      // Request and check permissions first
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissions required', 'Microphone access is needed to use this feature');
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        //interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_MIX_WITH_OTHERS,
        //interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
      });

      // Start background music
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/music.mp3'),
        { shouldPlay: true, isLooping: true, volume: 0.7 }
      );
      backgroundSoundRef.current = sound;

      // Start recording
      const recordingObject = new Audio.Recording();
      await recordingObject.prepareToRecordAsync({
        isMeteringEnabled: true,
        android: {
          extension: ".wav",
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: ".wav",
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
      });

      await recordingObject.startAsync();
      setRecording(recordingObject);
      monitorAudio(recordingObject);

    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert('Error', 'Failed to start audio recording');
    }
  };

  const monitorAudio = (recording) => {
    const interval = setInterval(async () => {
      try {
        const status = await recording.getStatusAsync();
        if (status.isRecording && status.metering !== undefined) {
          if (status.metering > BLOW_THRESHOLD) {
            setProgress((prev) => {
              const newProgress = Math.min(prev + PROGRESS_INCREMENT, MAX_PROGRESS);
              if (newProgress >= MAX_PROGRESS) {
                setIsTurnedOff(true);
                clearInterval(interval);
                recording.stopAndUnloadAsync();
                setRecording(null);
                if (backgroundSoundRef.current) {
                  backgroundSoundRef.current.stopAsync();
                  backgroundSoundRef.current.unloadAsync();
                }
              }
              return newProgress;
            });
          } else {
            setProgress((prev) => Math.max(prev - PROGRESS_INCREMENT / 2, 0));
          }
        }
      } catch (error) {
        console.error("Monitoring error:", error);
        clearInterval(interval);
      }
    }, 100);
  };

  return (
    <View style={styles.container}>
      {!isTurnedOff ? (
        <>
          <Text style={styles.text}>Blow into the microphone</Text>
          <ProgressBar progress={progress} color="blue" style={styles.progressBar} />
          <Button title="Start" onPress={startRecording} disabled={!!recording} />
        </>
      ) : (
        <Text style={styles.successText}>Successfully Turned Off!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 18,
    marginBottom: 20,
  },
  progressBar: {
    width: 200,
    height: 10,
    marginBottom: 20,
  },
  successText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "green",
  },
});