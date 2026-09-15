import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
export type Child = { id: string; name: string; schoolId: string };
export type Submission = {
  id: string;
  childName: string;
  schoolName: string;
  date: string;
  status: string;
};
type State = {
  children: Child[];
  history: Submission[];
  ready: boolean;
  addChild: (c: Omit<Child, "id">) => Promise<void>;
  removeChild: (id: string) => Promise<void>;
  addHistory: (s: Omit<Submission, "id">) => Promise<void>;
};
const Ctx = createContext<State>({} as State);
const KEY = "neo-excuse-pass4";
export function AppProvider({ children: node }: { children: React.ReactNode }) {
  const [kids, setKids] = useState<Child[]>([]);
  const [history, setHistory] = useState<Submission[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v) {
          try {
            const x = JSON.parse(v);
            setKids(x.children || []);
            setHistory(x.history || []);
          } catch {}
        }
      })
      .finally(() => setReady(true));
  }, []);
  async function save(k = kids, h = history) {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ children: k, history: h }),
    );
  }
  async function addChild(c: Omit<Child, "id">) {
    const k = [...kids, { ...c, id: Date.now().toString() }];
    setKids(k);
    await save(k, history);
  }
  async function removeChild(id: string) {
    const k = kids.filter((x) => x.id !== id);
    setKids(k);
    await save(k, history);
  }
  async function addHistory(s: Omit<Submission, "id">) {
    const h = [{ ...s, id: Date.now().toString() }, ...history];
    setHistory(h);
    await save(kids, h);
  }
  return (
    <Ctx.Provider
      value={{
        children: kids,
        history,
        ready,
        addChild,
        removeChild,
        addHistory,
      }}
    >
      {node}
    </Ctx.Provider>
  );
}
export const useApp = () => useContext(Ctx);
