import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProvider } from "@/context/AppState";
export default function Layout() {
  return (
    <AppProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#07182f" },
          headerTintColor: "#fff",
          contentStyle: { backgroundColor: "#07182f" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="children" options={{ title: "Children" }} />
        <Stack.Screen name="send" options={{ title: "Send an Excuse" }} />
        <Stack.Screen
          name="history"
          options={{ title: "Submission History" }}
        />
        <Stack.Screen name="schools" options={{ title: "School Directory" }} />
      </Stack>
    </AppProvider>
  );
}
