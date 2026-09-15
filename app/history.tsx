import { ScrollView, StyleSheet, Text } from "react-native";
import { Card } from "@/components/UI";
import { C } from "@/constants/theme";
import { useApp } from "@/context/AppState";
export default function History() {
  const { history } = useApp();
  return (
    <ScrollView contentContainerStyle={s.page}>
      {history.length === 0 ? (
        <Card>
          <Text style={s.h}>No submissions yet</Text>
          <Text style={s.m}>This history stays on this device.</Text>
        </Card>
      ) : (
        history.map((x) => (
          <Card key={x.id}>
            <Text style={s.h}>{x.childName}</Text>
            <Text style={s.m}>{x.schoolName}</Text>
            <Text style={s.ok}>{x.status}</Text>
            <Text style={s.m}>{new Date(x.date).toLocaleString()}</Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: {
    padding: 20,
    gap: 12,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  h: { color: C.text, fontSize: 18, fontWeight: "900" },
  m: { color: C.muted },
  ok: { color: C.green, fontWeight: "900" },
});
