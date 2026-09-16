import { router } from "expo-router";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useEffect, useState } from "react";

import { Btn, Card } from "@/components/UI";
import { C } from "@/constants/theme";
import { useApp } from "@/context/AppState";
import { fetchSchools, type School } from "@/data/schools";

export default function Home() {
  const { children, history } = useApp();

  const [schools, setSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [schoolError, setSchoolError] = useState<string | null>(null);

  async function loadSchools() {
    setLoadingSchools(true);
    setSchoolError(null);

    try {
      const loaded = await fetchSchools();
      setSchools(loaded);
    } catch (error) {
      console.error("Unable to load schools:", error);

      setSchools([]);
      setSchoolError(
        error instanceof Error
          ? error.message
          : "Unable to load verified schools.",
      );
    } finally {
      setLoadingSchools(false);
    }
  }

  useEffect(() => {
    loadSchools();
  }, []);

  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.hero}>
        <Image
          source={require("../assets/logo.png")}
          style={s.logo}
        />

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
          children.map((child) => {
            const school = schools.find(
              (item) => item.id === child.schoolId,
            );

            return (
              <View key={child.id} style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{child.name}</Text>

                  <Text style={s.m}>
                    {loadingSchools
                      ? "Loading school..."
                      : school?.name || "School not found"}
                  </Text>
                </View>

                <Btn
                  title="Send Excuse"
                  onPress={() =>
                    router.push({
                      pathname: "/send",
                      params: {
                        childId: child.id,
                      },
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
          {loadingSchools ? (
            <ActivityIndicator />
          ) : (
            <Text style={s.big}>{schools.length}</Text>
          )}

          <Text style={s.m}>Verified schools</Text>

          {schoolError ? (
            <Text style={s.error}>{schoolError}</Text>
          ) : null}

          <Btn
            title="Schools"
            secondary
            onPress={() => router.push("/schools")}
          />

          <Btn
            title="Refresh"
            secondary
            onPress={loadSchools}
          />
        </Card>
      </View>

      <Text style={s.privacy}>
        Privacy-first: child profiles and submission history are stored locally
        on this device. Doctor-note images are sent only when you submit an
        excuse and are processed by the Neo's ExcuseExpress API and email
        service for delivery to the selected verified school.
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

  hero: {
    alignItems: "center",
    paddingTop: 34,
    gap: 8,
  },

  logo: {
    width: 120,
    height: 120,
    borderRadius: 28,
  },

  title: {
    color: C.text,
    fontSize: 32,
    fontWeight: "900",
  },

  sub: {
    color: C.muted,
    fontSize: 16,
    textAlign: "center",
    maxWidth: 600,
  },

  h: {
    color: C.text,
    fontSize: 21,
    fontWeight: "900",
  },

  m: {
    color: C.muted,
  },

  error: {
    color: "#ff8b8b",
    fontSize: 12,
  },

  name: {
    color: C.text,
    fontSize: 18,
    fontWeight: "800",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },

  grid: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },

  big: {
    fontSize: 32,
    color: C.green,
    fontWeight: "900",
  },

  privacy: {
    color: C.muted,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    padding: 10,
  },
});
