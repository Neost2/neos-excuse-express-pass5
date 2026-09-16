import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { Btn, Card, Label } from "@/components/UI";
import { C } from "@/constants/theme";
import { useApp } from "@/context/AppState";
import { fetchSchools, type School } from "@/data/schools";

const API =
  process.env.EXPO_PUBLIC_SEND_API_URL || "http://localhost:8080";

export default function Send() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { children, addHistory } = useApp();

  const child =
    children.find((x) => x.id === childId) || children[0];

  const [schools, setSchools] = useState<School[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [schoolLoadError, setSchoolLoadError] = useState<string | null>(
    null,
  );

  const [uri, setUri] = useState("");
  const [mime, setMime] = useState("image/jpeg");
  const [absence, setAbsence] = useState(
    new Date().toLocaleDateString(),
  );
  const [returnDate, setReturn] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSchools() {
      setSchoolsLoading(true);
      setSchoolLoadError(null);

      try {
        const loaded = await fetchSchools();

        if (mounted) {
          setSchools(loaded);
        }
      } catch (error) {
        console.error("Unable to load schools:", error);

        if (mounted) {
          setSchools([]);
          setSchoolLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load verified schools.",
          );
        }
      } finally {
        if (mounted) {
          setSchoolsLoading(false);
        }
      }
    }

    loadSchools();

    return () => {
      mounted = false;
    };
  }, []);

  const school = child
    ? schools.find((x) => x.id === child.schoolId)
    : undefined;

  async function camera() {
    const p = await ImagePicker.requestCameraPermissionsAsync();

    if (!p.granted) {
      return Alert.alert("Camera permission needed");
    }

    const r = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });

    if (!r.canceled) {
      const a = r.assets[0];

      setUri(a.uri);
      setMime(a.mimeType || "image/jpeg");

      if (Platform.OS !== "web") {
        try {
          const { Asset, requestPermissionsAsync } =
            await import("expo-media-library");

          const permission = await requestPermissionsAsync();

          if (permission.granted) {
            await Asset.create(a.uri);
            console.log("Doctor note saved to photo library");
          } else {
            console.log("Photo library permission denied");
          }
        } catch (error) {
          console.log(
            "Could not save photo to media library:",
            error,
          );
        }
      }
    }
  }

  async function gallery() {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });

    if (!r.canceled) {
      setUri(r.assets[0].uri);
      setMime(r.assets[0].mimeType || "image/jpeg");
    }
  }

  async function send() {
    if (!child) {
      return Alert.alert("Add a child first.");
    }

    if (!school) {
      return Alert.alert(
        "School not available",
        "This child's school is not currently in the verified school list. Refresh the app or update the child's school.",
      );
    }

    if (!school.verified) {
      return Alert.alert(
        "School not verified",
        "This app will not route a document to an unverified destination.",
      );
    }

    if (!uri) {
      return Alert.alert("Add the note first.");
    }

    setSending(true);

    try {
      const fd = new FormData();

      fd.append("schoolId", school.id);
      fd.append("studentName", child.name);
      fd.append("absenceDate", absence);
      fd.append("returnDate", returnDate);
      fd.append("parentEmail", parentEmail);

      const imageResponse = await fetch(uri);

      if (!imageResponse.ok) {
        throw new Error(
          "Could not read the doctor note image.",
        );
      }

      const rawBlob = await imageResponse.blob();

      const uploadMime =
        mime && mime.startsWith("image/")
          ? mime
          : rawBlob.type &&
              rawBlob.type.startsWith("image/")
            ? rawBlob.type
            : "image/jpeg";

      const imageBlob = new Blob([rawBlob], {
        type: uploadMime,
      });

      const extension =
        uploadMime === "image/png"
          ? "png"
          : uploadMime === "image/heic" ||
              uploadMime === "image/heif"
            ? "heic"
            : "jpg";

      fd.append(
        "note",
        imageBlob,
        `doctor-note.${extension}`,
      );

      const r = await fetch(`${API}/api/send-excuse`, {
        method: "POST",
        body: fd,
      });

      const data = await r.json();

      if (!r.ok) {
        throw new Error(data.error || "Send failed");
      }

      await addHistory({
        childName: child.name,
        schoolName: school.name,
        date: new Date().toISOString(),
        status: `Submitted • ${data.submissionId}`,
      });

      Alert.alert(
        "Excuse submitted",
        `Submitted to ${school.name}.\n\nConfirmation: ${data.submissionId}`,
        [
          {
            text: "Done",
            onPress: () => router.replace("/"),
          },
        ],
      );
    } catch (e: any) {
      Alert.alert(
        "Could not send",
        `${e.message}\n\nYour photo remains on your device. Please try again.`,
      );
    } finally {
      setSending(false);
    }
  }

  if (!child) {
    return (
      <View style={s.page}>
        <Card>
          <Text style={s.h}>Add a child first</Text>

          <Btn
            title="Add Child"
            onPress={() => router.replace("/children")}
          />
        </Card>
      </View>
    );
  }

  if (schoolsLoading) {
    return (
      <View style={s.centerPage}>
        <ActivityIndicator />
        <Text style={s.m}>Loading verified school...</Text>
      </View>
    );
  }

  if (schoolLoadError) {
    return (
      <View style={s.page}>
        <Card>
          <Text style={s.h}>Could not load schools</Text>
          <Text style={s.warn}>{schoolLoadError}</Text>

          <Btn
            title="Back"
            secondary
            onPress={() => router.replace("/")}
          />
        </Card>
      </View>
    );
  }

  if (!school) {
    return (
      <View style={s.page}>
        <Card>
          <Text style={s.h}>School not found</Text>

          <Text style={s.m}>
            The school saved for {child.name} is not currently in the
            verified school list.
          </Text>

          <Btn
            title="Update Child"
            onPress={() => router.replace("/children")}
          />

          <Btn
            title="Back"
            secondary
            onPress={() => router.replace("/")}
          />
        </Card>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.page}>
      <Card>
        <Text style={s.h}>{child.name}</Text>

        <Text style={s.m}>To: {school.name}</Text>

        <Text style={school.verified ? s.ok : s.warn}>
          {school.verified
            ? "Verified school destination"
            : "School destination needs verification"}
        </Text>
      </Card>

      <Card>
        <Text style={s.h}>1. Add the note</Text>

        <View style={s.buttons}>
          <Btn title="Take Photo" onPress={camera} />

          <Btn
            title="Choose Existing Photo"
            secondary
            onPress={gallery}
          />
        </View>

        {uri ? (
          <Image
            source={{ uri }}
            style={s.preview}
          />
        ) : (
          <Text style={s.m}>
            No image selected. Camera photos are saved to your
            device Photos when permission is granted.
          </Text>
        )}
      </Card>

      <Card>
        <Text style={s.h}>2. Confirm details</Text>

        <Label>Absence / appointment date</Label>

        <TextInput
          value={absence}
          onChangeText={setAbsence}
          style={s.input}
        />

        <Label>Return date (optional)</Label>

        <TextInput
          value={returnDate}
          onChangeText={setReturn}
          placeholder="e.g. 9/16/2026"
          placeholderTextColor="#789"
          style={s.input}
        />

        <Label>
          Parent email (optional, used as Reply-To)
        </Label>

        <TextInput
          value={parentEmail}
          onChangeText={setParentEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="parent@example.com"
          placeholderTextColor="#789"
          style={s.input}
        />
      </Card>

      <Card>
        <Text style={s.h}>3. Review & send</Text>

        <Text style={s.m}>
          Recipient: {school.name}
        </Text>

        <Text style={s.m}>
          You stay inside Neo's ExcuseExpress. The image is sent
          over HTTPS to the Neo's ExcuseExpress API for email
          delivery to the selected verified school. The API uses
          memory-only upload handling and does not intentionally
          write the note image to its own disk or database.
        </Text>

        {sending ? (
          <ActivityIndicator />
        ) : (
          <Btn
            title="Send Excuse"
            disabled={!uri || !school.verified}
            onPress={send}
          />
        )}
      </Card>
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

  centerPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 20,
  },

  h: {
    color: C.text,
    fontSize: 20,
    fontWeight: "900",
  },

  m: {
    color: C.muted,
    lineHeight: 20,
  },

  ok: {
    color: C.green,
    fontWeight: "900",
  },

  warn: {
    color: C.amber,
    fontWeight: "900",
  },

  buttons: {
    gap: 10,
  },

  preview: {
    width: "100%",
    height: 340,
    resizeMode: "contain",
    backgroundColor: "#03101f",
    borderRadius: 14,
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
