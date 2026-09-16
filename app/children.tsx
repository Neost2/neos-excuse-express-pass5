import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { router } from "expo-router";

import { Btn, Card, Label } from "@/components/UI";
import { C } from "@/constants/theme";
import { fetchSchools, type School } from "@/data/schools";
import { useApp } from "@/context/AppState";

export default function Children() {
  const { children, addChild, removeChild } = useApp();

  const [name, setName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [schoolError, setSchoolError] = useState<string | null>(null);

  const loadSchools = useCallback(async () => {
    setLoadingSchools(true);
    setSchoolError(null);

    try {
      const loaded = await fetchSchools();

      setSchools(loaded);

      setSchoolId((current) => {
        if (
          current &&
          loaded.some((school) => school.id === current)
        ) {
          return current;
        }

        return loaded[0]?.id ?? "";
      });
    } catch (error) {
      setSchools([]);
      setSchoolId("");

      setSchoolError(
        error instanceof Error
          ? error.message
          : "Unable to load schools.",
      );
    } finally {
      setLoadingSchools(false);
    }
  }, []);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  async function add() {
    if (!name.trim()) {
      return Alert.alert("Name required");
    }

    if (!schoolId) {
      return Alert.alert(
        "School required",
        "Choose a verified school before saving this student.",
      );
    }

    await addChild({
      name: name.trim(),
      schoolId,
    });

    setName("");

    Alert.alert(
      "Student Saved",
      "Do you have another student to add?",
      [
        {
          text: "Yes, Add Another",
          onPress: () => {
            setName("");
          },
        },
        {
          text: "No, I'm Done",
          onPress: () => {
            router.replace("/");
          },
        },
      ],
    );
  }

  return (
    <ScrollView contentContainerStyle={s.page}>
      <Card>
        <Text style={s.h}>Add a child</Text>

        <Label>Child name</Label>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Student name"
          placeholderTextColor="#789"
          style={s.input}
        />

        <Label>School</Label>

        {loadingSchools ? (
          <>
            <ActivityIndicator />
            <Text style={s.m}>
              Loading verified schools...
            </Text>
          </>
        ) : schoolError ? (
          <>
            <Text style={s.error}>{schoolError}</Text>

            <Btn
              title="Try loading schools again"
              secondary
              onPress={loadSchools}
            />
          </>
        ) : schools.length === 0 ? (
          <>
            <Text style={s.m}>
              No verified schools are available yet.
            </Text>

            <Btn
              title="Refresh school list"
              secondary
              onPress={loadSchools}
            />
          </>
        ) : (
          schools.map((school) => {
            const location = [school.city, school.state]
              .filter(Boolean)
              .join(", ");

            return (
              <Btn
                key={school.id}
                title={`${schoolId === school.id ? "✓ " : ""}${school.name}${
                  location ? ` • ${location}` : ""
                }`}
                secondary={schoolId !== school.id}
                onPress={() => setSchoolId(school.id)}
              />
            );
          })
        )}

        <Btn title="Save Child" onPress={add} />

        <Btn
          title="Refresh Schools"
          secondary
          onPress={loadSchools}
        />
      </Card>

      {children.map((child) => {
        const school = schools.find(
          (item) => item.id === child.schoolId,
        );

        return (
          <Card key={child.id}>
            <Text style={s.h}>{child.name}</Text>

            <Text style={s.m}>
              {school?.name ??
                "School will appear when the verified list loads"}
            </Text>

            <Btn
              title="Remove from this device"
              secondary
              onPress={() =>
                Alert.alert(
                  "Remove child?",
                  child.name,
                  [
                    {
                      text: "Cancel",
                    },
                    {
                      text: "Remove",
                      style: "destructive",
                      onPress: () =>
                        removeChild(child.id),
                    },
                  ],
                )
              }
            />
          </Card>
        );
      })}
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

  h: {
    color: C.text,
    fontSize: 20,
    fontWeight: "900",
  },

  m: {
    color: C.muted,
  },

  error: {
    color: "#ff8b8b",
    marginBottom: 8,
  },

  input: {
    backgroundColor: C.bg,
    color: C.text,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#315779",
  },
});
