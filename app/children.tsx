import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { Btn, Card, Label } from '@/components/UI';
import { C } from '@/constants/theme';
import { schools } from '@/data/schools';
import { useApp } from '@/context/AppState';

export default function Children() {
  const { children, addChild, removeChild } = useApp();

  const [name, setName] = useState('');
  const [schoolId, setSchool] = useState(schools[0].id);

  async function add() {
    if (!name.trim()) {
      return Alert.alert('Name required');
    }

    await addChild({
      name: name.trim(),
      schoolId,
    });

    setName('');

    Alert.alert(
      'Student Saved',
      'Do you have another student to add?',
      [
        {
          text: 'Yes, Add Another',
          onPress: () => {
            setName('');
          },
        },
        {
          text: "No, I'm Done",
          onPress: () => {
            router.replace('/');
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

        {schools.map((sc) => (
          <Btn
            key={sc.id}
            title={`${schoolId === sc.id ? '✓ ' : ''}${sc.name}${
              sc.verified ? ' • Verified' : ' • Needs verification'
            }`}
            secondary={schoolId !== sc.id}
            onPress={() => setSchool(sc.id)}
          />
        ))}

        <Btn title="Save Child" onPress={add} />
      </Card>

      {children.map((k) => (
        <Card key={k.id}>
          <Text style={s.h}>{k.name}</Text>

          <Text style={s.m}>
            {schools.find((x) => x.id === k.schoolId)?.name}
          </Text>

          <Btn
            title="Remove from this device"
            secondary
            onPress={() =>
              Alert.alert('Remove child?', k.name, [
                {
                  text: 'Cancel',
                },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: () => removeChild(k.id),
                },
              ])
            }
          />
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
    width: '100%',
    alignSelf: 'center',
  },

  h: {
    color: C.text,
    fontSize: 20,
    fontWeight: '900',
  },

  m: {
    color: C.muted,
  },

  input: {
    backgroundColor: C.bg,
    color: C.text,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#315779',
  },
});
