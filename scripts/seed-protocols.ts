import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const envFile = readFileSync(".env.local", "utf-8");
const envVars: Record<string, string> = {};
for (const line of envFile.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) envVars[key.trim()] = rest.join("=").trim();
}

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY,
);

async function seed() {
  console.log("Seeding mock protocols...");

  // 1) Handover protocols (active - no return yet)
  const activeHandovers = [
    {
      type: "handover" as const,
      customer_first_name: "Martin",
      customer_last_name: "Kováč",
      customer_email: "martin.kovac@email.sk",
      customer_phone: "+421 911 222 333",
      car_name: "BMW 320d",
      car_license_plate: "BA-123-AB",
      reservation_number: "R-2026-0045",
      protocol_datetime: "2026-04-25T09:00:00+02:00",
      expected_return_datetime: "2026-04-30T09:00:00+02:00",
      location: "Bratislava - letisko",
      mileage_km: 45230,
      fuel_level: "4/4" as const,
      allowed_km: 1500,
      deposit_amount: 500,
      deposit_method: "card_hold" as const,
      status: "completed" as const,
      damages: JSON.stringify([]),
    },
    {
      type: "handover" as const,
      customer_first_name: "Jana",
      customer_last_name: "Nováková",
      customer_email: "jana.novakova@gmail.com",
      customer_phone: "+421 902 444 555",
      car_name: "Škoda Octavia Combi",
      car_license_plate: "BA-456-CD",
      reservation_number: "R-2026-0048",
      protocol_datetime: "2026-04-26T14:30:00+02:00",
      expected_return_datetime: "2026-05-03T14:30:00+02:00",
      location: "Bratislava - centrum",
      mileage_km: 31450,
      fuel_level: "3/4" as const,
      allowed_km: 2000,
      deposit_amount: 300,
      deposit_method: "cash" as const,
      status: "completed" as const,
      damages: JSON.stringify([
        { description: "Drobný škrabanec na zadnom nárazníku", photo_urls: [] },
      ]),
    },
    {
      type: "handover" as const,
      customer_first_name: "Peter",
      customer_last_name: "Horváth",
      customer_email: "peter.horvath@firma.sk",
      customer_phone: "+421 917 666 777",
      car_name: "Mercedes-Benz GLC 300",
      car_license_plate: "BA-789-EF",
      protocol_datetime: "2026-04-27T08:00:00+02:00",
      expected_return_datetime: "2026-05-02T08:00:00+02:00",
      location: "Košice - hlavná stanica",
      mileage_km: 12800,
      fuel_level: "4/4" as const,
      allowed_km: 1000,
      deposit_amount: 800,
      deposit_method: "bank_transfer" as const,
      status: "completed" as const,
      damages: JSON.stringify([]),
    },
  ];

  // 2) Handovers that WILL have return protocols (completed cycle)
  const completedHandovers = [
    {
      type: "handover" as const,
      customer_first_name: "Tomáš",
      customer_last_name: "Šimko",
      customer_email: "tomas.simko@email.sk",
      customer_phone: "+421 905 111 222",
      car_name: "Audi A4 Avant",
      car_license_plate: "BA-321-GH",
      reservation_number: "R-2026-0039",
      protocol_datetime: "2026-04-15T10:00:00+02:00",
      expected_return_datetime: "2026-04-22T10:00:00+02:00",
      location: "Bratislava - Petržalka",
      mileage_km: 67500,
      fuel_level: "4/4" as const,
      allowed_km: 1500,
      deposit_amount: 600,
      deposit_method: "card_hold" as const,
      status: "completed" as const,
      damages: JSON.stringify([]),
    },
    {
      type: "handover" as const,
      customer_first_name: "Lucia",
      customer_last_name: "Blahová",
      customer_email: "lucia.blahova@outlook.sk",
      customer_phone: "+421 908 333 444",
      car_name: "Volkswagen Passat",
      car_license_plate: "BA-654-IJ",
      reservation_number: "R-2026-0041",
      protocol_datetime: "2026-04-10T16:00:00+02:00",
      expected_return_datetime: "2026-04-17T16:00:00+02:00",
      location: "Bratislava - letisko",
      mileage_km: 89200,
      fuel_level: "3/4" as const,
      allowed_km: 1500,
      deposit_amount: 400,
      deposit_method: "cash" as const,
      status: "completed" as const,
      damages: JSON.stringify([
        { description: "Odretie na ľavom prahu", photo_urls: [] },
      ]),
    },
  ];

  // Insert active handovers
  const { data: activeData, error: activeError } = await supabase
    .from("handover_protocols")
    .insert(activeHandovers)
    .select("id, customer_last_name");

  if (activeError) {
    console.error("Error inserting active handovers:", activeError);
    return;
  }
  console.log(`Inserted ${activeData.length} active handover protocols`);

  // Insert completed handovers
  const { data: completedData, error: completedError } = await supabase
    .from("handover_protocols")
    .insert(completedHandovers)
    .select("id, customer_last_name, mileage_km, allowed_km, car_name, car_license_plate, customer_first_name, customer_email, customer_phone");

  if (completedError) {
    console.error("Error inserting completed handovers:", completedError);
    return;
  }
  console.log(`Inserted ${completedData.length} completed handover protocols`);

  // Insert return protocols for completed handovers
  const returnProtocols = [
    {
      type: "return" as const,
      handover_protocol_id: completedData[0].id,
      customer_first_name: "Tomáš",
      customer_last_name: "Šimko",
      customer_email: "tomas.simko@email.sk",
      customer_phone: "+421 905 111 222",
      car_name: "Audi A4 Avant",
      car_license_plate: "BA-321-GH",
      reservation_number: "R-2026-0039",
      protocol_datetime: "2026-04-22T11:30:00+02:00",
      location: "Bratislava - Petržalka",
      mileage_km: 68850,
      fuel_level: "3/4" as const,
      allowed_km: 1500,
      km_exceeded: 0,
      km_exceeded_price: 0,
      extra_km_rate: 0.30,
      status: "completed" as const,
      damages: JSON.stringify([]),
    },
    {
      type: "return" as const,
      handover_protocol_id: completedData[1].id,
      customer_first_name: "Lucia",
      customer_last_name: "Blahová",
      customer_email: "lucia.blahova@outlook.sk",
      customer_phone: "+421 908 333 444",
      car_name: "Volkswagen Passat",
      car_license_plate: "BA-654-IJ",
      reservation_number: "R-2026-0041",
      protocol_datetime: "2026-04-18T09:00:00+02:00",
      location: "Bratislava - letisko",
      mileage_km: 90950,
      fuel_level: "2/4" as const,
      allowed_km: 1500,
      km_exceeded: 250,
      km_exceeded_price: 75.00,
      extra_km_rate: 0.30,
      status: "completed" as const,
      damages: JSON.stringify([
        { description: "Nová škvrna na čalúnení zadného sedadla", photo_urls: [] },
        { description: "Odretie na ľavom prahu (zhoršenie)", photo_urls: [] },
      ]),
    },
  ];

  const { data: returnData, error: returnError } = await supabase
    .from("handover_protocols")
    .insert(returnProtocols)
    .select("id, customer_last_name");

  if (returnError) {
    console.error("Error inserting return protocols:", returnError);
    return;
  }
  console.log(`Inserted ${returnData.length} return protocols`);

  console.log("\nSeed complete! Summary:");
  console.log(`  Active handovers (no return):  ${activeData.length}`);
  console.log(`  Completed cycles (with return): ${completedData.length}`);
  console.log(`  Total protocols:               ${activeData.length + completedData.length + returnData.length}`);
}

seed().catch(console.error);
