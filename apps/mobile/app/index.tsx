import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { WidgetCreate } from "@app/schemas";
// SAME local hook as web — only the visual layer differs (RN primitives + NativeWind).
import { useCreateWidget, useWidgets } from "@app/api-client";
import { apiClient } from "../src/lib/api";

export default function WidgetsScreen() {
  const widgets = useWidgets(apiClient);
  const createWidget = useCreateWidget(apiClient);
  const [name, setName] = useState("");
  const [itemId, setItemId] = useState("");

  const onSubmit = () => {
    const parsed = WidgetCreate.safeParse({ name, item_id: itemId });
    if (!parsed.success) return;
    createWidget.mutate(parsed.data, {
      onSuccess: () => {
        setName("");
        setItemId("");
      },
    });
  };

  return (
    <View className="flex-1 gap-4 bg-white p-4">
      <TextInput
        className="rounded-md border border-gray-300 px-3 py-2"
        placeholder="Widget name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        className="rounded-md border border-gray-300 px-3 py-2"
        placeholder="Item ID (shared Item)"
        value={itemId}
        onChangeText={setItemId}
      />
      <Pressable
        className="rounded-md bg-brand-accent px-4 py-3"
        disabled={createWidget.isPending}
        onPress={onSubmit}
      >
        <Text className="text-center font-medium text-white">
          {createWidget.isPending ? "Adding…" : "Add widget"}
        </Text>
      </Pressable>

      {widgets.isLoading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={widgets.data ?? []}
          keyExtractor={(w) => w.id}
          renderItem={({ item }) => (
            <View className="flex-row justify-between border-b border-gray-200 py-3">
              <Text className="font-medium">{item.name}</Text>
              <Text className="text-gray-500">item {item.item_id.slice(0, 8)}…</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
