import { router } from "expo-router";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Btn, Card } from "@/components/UI";
import { C } from "@/constants/theme";
import { useApp } from "@/context/AppState";
import { schools } from "@/data/schools";
export default function Home() {
  const { children, history } = useApp();
  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.hero}>
        <Image source={require("../assets/logo.png")} style={s.logo} />
        <Text style={s.title}>Neo's ExcuseExpress</Text>
        <Text style={s.sub}>
          Take a picture. Pick your child. Get the note ready for the right
          school.
        </Text>
      </View>
      <Card>
        <Text style={s.h}>Your Children</Text>
        {children.length === 0 ? (
          <Text style={s.m}>
            Add your child once, then their school stays on file on this device.
          </Text>
        ) : (
          children.map((k) => {
            const sc = schools.find((x) => x.id === k.schoolId);
            return (
              <View key={k.id} style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{k.name}</Text>
                  <Text style={s.m}>{sc?.name || "School not found"}</Text>
                </View>
                <Btn
                  title="Send Excuse"
                  onPress={() =>
                    router.push({
                      pathname: "/send",
                      params: { childId: k.id },
                    })
                  }
                />
              </View>
            );
          })
        )}
        <Btn
          title="+ Add / Manage Children"
          secondary
          onPress={() => router.push("/children")}
        />
      </Card>
      <View style={s.grid}>
        <Card style={{ flex: 1 }}>
          <Text style={s.big}>{history.length}</Text>
          <Text style={s.m}>Local submission records</Text>
          <Btn
            title="History"
            secondary
            onPress={() => router.push("/history")}
          />
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={s.big}>{schools.filter((x) => x.verified).length}</Text>
          <Text style={s.m}>Demo verified schools</Text>
          <Btn
            title="Schools"
            secondary
            onPress={() => router.push("/schools")}
          />
        </Card>
      </View>
      <Text style={s.privacy}>
        Privacy-first: child profiles and submission history are stored locally
        on this device. Pass 4 does not upload doctor's-note images to a Neo
        cloud server.
      </Text>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: {
    padding: 20,
    gap: 16,
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
  },
  hero: { alignItems: "center", paddingTop: 34, gap: 8 },
  logo: { width: 120, height: 120, borderRadius: 28 },
  title: { color: C.text, fontSize: 32, fontWeight: "900" },
  sub: { color: C.muted, fontSize: 16, textAlign: "center", maxWidth: 600 },
  h: { color: C.text, fontSize: 21, fontWeight: "900" },
  m: { color: C.muted },
  name: { color: C.text, fontSize: 18, fontWeight: "800" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  grid: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  big: { fontSize: 32, color: C.green, fontWeight: "900" },
  privacy: {
    color: C.muted,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    padding: 10,
  },
});
