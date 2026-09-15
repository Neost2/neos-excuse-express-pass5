import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/UI";
import { C } from "@/constants/theme";
import { schools } from "@/data/schools";
export default function Schools() {
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.note}>
        Pass 4 uses demo routing addresses. Replace an address only after the
        school or district confirms the correct front-office/attendance email.
      </Text>
      {schools.map((x) => (
        <Card key={x.id}>
          <View style={s.row}>
            <Text style={s.h}>{x.name}</Text>
            <Text
              style={{
                color: x.verified ? C.green : C.amber,
                fontWeight: "900",
              }}
            >
              {x.verified ? "VERIFIED" : "REVIEW"}
            </Text>
          </View>
          <Text style={s.m}>
            {x.district} • {x.city}, {x.state}
          </Text>
          <Text style={s.email}>{x.email}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: {
    padding: 20,
    gap: 14,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  note: { color: C.muted, lineHeight: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  h: { color: C.text, fontSize: 18, fontWeight: "900" },
  m: { color: C.muted },
  email: { color: C.cyan },
});
