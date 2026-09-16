export type School = {
  id: string;
  name: string;
  district: string;
  city: string;
  state: string;
  email: string;
  verified: boolean;
};
export const schools: School[] = [
  {
    id: "wagoner-hs",
    name: "Wagoner High School",
    district: "Wagoner Public Schools",
    city: "Wagoner",
    state: "OK",
    email: "neost2@hotmail.com",
    verified: true,
  },
  {
    id: "wagoner-ms",
    name: "Wagoner Middle School",
    district: "Wagoner Public Schools",
    city: "Wagoner",
    state: "OK",
    email: "neost2@hotmail.com",
    verified: true,
  },
  {
    id: "demo-elementary",
    name: "Demo Elementary School",
    district: "Demo Public Schools",
    city: "Demo City",
    state: "OK",
    email: "neost2@hotmail.com",
    verified: false,
  },
];
// IMPORTANT: Replace demo addresses only after a school/district verifies the destination.
