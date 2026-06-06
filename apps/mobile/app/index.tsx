import { ActivityIndicator, FlatList, Linking, Pressable, Text, View } from "react-native";
// SAME local hooks as web — only the visual layer differs (RN primitives + NativeWind).
import { useProfile } from "@app/api-client";
import { apiClient } from "../src/lib/api";

export default function ProfileScreen() {
  const profile = useProfile(apiClient);

  if (profile.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </View>
    );
  }
  if (profile.isError || !profile.data) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">Could not load profile.</Text>
      </View>
    );
  }

  const { basics, work } = profile.data;

  return (
    <View className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold text-brand">{basics.name}</Text>
      {basics.label ? <Text className="text-brand-accent">{basics.label}</Text> : null}
      {basics.summary ? <Text className="mt-1 text-gray-600">{basics.summary}</Text> : null}

      <Pressable
        className="mt-4 rounded-md bg-brand-accent px-4 py-3"
        onPress={() => Linking.openURL(apiClient.cvUrl("pdf"))}
      >
        <Text className="text-center font-medium text-white">Download CV (PDF)</Text>
      </Pressable>

      <Text className="mb-2 mt-6 text-lg font-semibold text-brand">Experience</Text>
      <FlatList
        data={work}
        keyExtractor={(w, i) => `${w.name}-${i}`}
        renderItem={({ item }) => (
          <View className="border-b border-gray-200 py-3">
            <Text className="font-medium">
              {item.position} — {item.name}
            </Text>
            <Text className="text-sm text-gray-500">
              {item.startDate} – {item.endDate ?? "Present"}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
