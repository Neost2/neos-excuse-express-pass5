import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Btn, Card } from "@/components/UI";
import { C } from "@/constants/theme";
import { fetchSchools, type School } from "@/data/schools";

export default function Schools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSchools = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const loaded = await fetchSchools();
      setSchools(loaded);
    } catch (err) {
      console.error("Unable to load schools:", err);
      setSchools([]);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load verified schools.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  return (
    <ScrollView contentContainerStyle={s.page}>
      <Card>
        <Text style={s.h}>Verified Schools</Text>

        <Text style={s.m}>
          These are schools that have verified their attendance or front-office
          email through Neo&apos;s ExcuseExpress.
        </Text>

        <Btn
          title="Refresh Schools"
          secondary
          onPress={loadSchools}
        />
      </Card>

      {loading ? (
        <Card>
          <View style={s.loading}>
            <ActivityIndicator />
            <Text style={s.m}>Loading verified schools...</Text>
          </View>
        </Card>
      ) : error ? (
        <Card>
          <Text style={s.warn}>Could not load schools</Text>
          <Text style={s.m}>{error}</Text>

          <Btn
            title="Try Again"
            onPress={loadSchools}
          />
        </Card>
      ) : schools.length === 0 ? (
        <Card>
          <Text style={s.h}>No verified schools yet</Text>

          <Text style={s.m}>
            A school will appear here after its registration email has been
            verified.
          </Text>
        </Card>
      ) : (
        schools.map((school) => {
          const location = [school.city, school.state]
            .filter(Boolean)
            .join(", ");

          return (
            <Card key={school.id}>
              <View style={s.row}>
                <View style={s.info}>
                  <Text style={s.h}>{school.name}</Text>

                  {school.district ? (
                    <Text style={s.m}>{school.district}</Text>
                  ) : null}

                  {location ? (
                    <Text style={s.m}>{location}</Text>
                  ) : null}
                </View>

                <Text style={s.ok}>Verified</Text>
              </View>
            </Card>
          );
        })
      )}
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

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  info: {
    flex: 1,
    gap: 4,
  },

  loading: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
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
});
