import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCbZQmOWOPLR1H_eCEIllFZajuDkQ-l6hs",
  authDomain: "surplus-food-4cc9f.firebaseapp.com",
  projectId: "surplus-food-4cc9f",
  storageBucket: "surplus-food-4cc9f.firebasestorage.app",
  messagingSenderId: "916375810203",
  appId: "1:916375810203:web:5ef31e64ea85a18dec963e",
  measurementId: "G-07KDH874G8",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const projectId = firebaseConfig.projectId;
const password = "LastBite!123";
const runTag = process.env.LASTBITE_SEED_TAG || new Date().toISOString().slice(0, 10).replace(/-/g, "");
const baseTime = new Date();
const oneHour = 60 * 60 * 1000;
const summaryPath = path.resolve("datasets", `firebase-seed-summary-${runTag}.json`);
  const imageCache = new Map();

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * oneHour);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function timestampValue(date) {
  return { timestampValue: date.toISOString() };
}

function fieldValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return timestampValue(value);

  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((entry) => fieldValue(entry)) } };
  }

  if (typeof value === "boolean") return { booleanValue: value };

  if (typeof value === "number") {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }

  if (typeof value === "string") return { stringValue: value };

  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([key, entry]) => [key, fieldValue(entry)])
        ),
      },
    };
  }

  throw new Error(`Unsupported Firestore value: ${value}`);
}

function documentBody(data) {
  return {
    fields: Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, fieldValue(value)])
    ),
  };
}

async function firestoreWrite(idToken, documentPath, data) {
  const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${documentPath}`;
  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(documentBody(data)),
  });

  if (!response.ok) {
    throw new Error(`Firestore write failed for ${documentPath}: ${await response.text()}`);
  }

  return response.json();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "LastBiteDemoSeed/1.0 (https://surplus-food-4cc9f.web.app)",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed ${response.status} for ${url}`);
  }

  return response.json();
}

async function wikipediaThumbnail(query) {
  if (imageCache.has(query)) return imageCache.get(query);

  const searchQueries = [query, `${query} Indian dish`, `${query} Indian food`];

  for (const candidate of searchQueries) {
    const url =
      "https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search" +
      `&gsrsearch=${encodeURIComponent(candidate)}` +
      "&gsrlimit=5&prop=pageimages|info&piprop=thumbnail&pithumbsize=420&pilimit=5&inprop=url&origin=*";

    const payload = await fetchJson(url);
    const pages = Object.values(payload.query?.pages || {});
    const page = pages.find((entry) => entry.thumbnail?.source);

    if (page?.thumbnail?.source) {
      const result = {
        title: page.title,
        imageUrl: page.thumbnail.source,
        pageUrl: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
      };
      imageCache.set(query, result);
      return result;
    }
  }

  throw new Error(`No Wikipedia image found for "${query}"`);
}

async function imageUrlToDataUrl(imageUrl) {
  const response = await fetch(imageUrl, {
    headers: {
      "User-Agent": "LastBiteDemoSeed/1.0 (https://surplus-food-4cc9f.web.app)",
    },
  });

  if (!response.ok) {
    throw new Error(`Image download failed ${response.status} for ${imageUrl}`);
  }

  const mimeType = response.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

async function createAccount(profile) {
  const email = `${profile.slug}.${runTag}@lastbite-demo.test`;
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const idToken = await credential.user.getIdToken();
  const uid = credential.user.uid;
  const createdAt = addHours(baseTime, profile.createdOffsetHours || 0);
  const updatedAt = addHours(createdAt, 2);

  const userDoc = {
    email,
    name: profile.name,
    userType: profile.userType,
    walletBalance: profile.walletBalance ?? 0,
    rewardsPoints: profile.rewardsPoints ?? 0,
    membershipTier: profile.membershipTier ?? "silver",
    address: profile.address,
    phone: profile.phone,
    createdAt,
    updatedAt,
  };

  if (profile.orgName) userDoc.orgName = profile.orgName;

  await firestoreWrite(idToken, `users/${uid}`, userDoc);

  if (profile.userType === "restaurant") {
    await firestoreWrite(idToken, `restaurants/${uid}`, {
      ownerId: uid,
      name: profile.orgName || profile.name,
      email,
      address: profile.address,
      phone: profile.phone,
      isPartner: true,
      isActive: true,
      rating: profile.rating ?? 4.6,
      totalOrders: 0,
      cuisineTag: profile.cuisineTag,
      createdAt,
      updatedAt,
    });
  }

  if (profile.userType === "ngo") {
    await firestoreWrite(idToken, `ngos/${uid}`, {
      ownerId: uid,
      name: profile.orgName || profile.name,
      email,
      address: profile.address,
      phone: profile.phone,
      totalDonationsReceived: 0,
      mealsServed: 0,
      isVerified: true,
      createdAt,
      updatedAt,
    });
  }

  return { ...profile, email, uid, idToken };
}

async function getWriterToken(email) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user.getIdToken();
}

const restaurantsSeed = [
  { slug: "dilli-zaika-junction", name: "Raghav Malhotra", orgName: "Dilli Zaika Junction", userType: "restaurant", cuisineTag: "North Indian", address: "Shop 12, Connaught Place, New Delhi 110001", phone: "+91 98765 21001", rating: 4.7 },
  { slug: "hyderabad-dum-house", name: "Aisha Khan", orgName: "Hyderabad Dum House", userType: "restaurant", cuisineTag: "Hyderabadi", address: "Road No. 36, Jubilee Hills, Hyderabad 500033", phone: "+91 98765 21002", rating: 4.8 },
  { slug: "bengaluru-breakfast-co", name: "Nandan Rao", orgName: "Bengaluru Breakfast Co.", userType: "restaurant", cuisineTag: "South Indian", address: "80 Feet Road, Indiranagar, Bengaluru 560038", phone: "+91 98765 21003", rating: 4.6 },
  { slug: "mumbai-street-kitchen", name: "Priya Sawant", orgName: "Mumbai Street Kitchen", userType: "restaurant", cuisineTag: "Street Food", address: "Near Carter Road, Bandra West, Mumbai 400050", phone: "+91 98765 21004", rating: 4.5 },
  { slug: "kolkata-kathi-corner", name: "Arindam Dey", orgName: "Kolkata Kathi Corner", userType: "restaurant", cuisineTag: "Bengali", address: "Camac Street, Kolkata 700017", phone: "+91 98765 21005", rating: 4.6 },
  { slug: "chennai-curry-club", name: "Meena Subramanian", orgName: "Chennai Curry Club", userType: "restaurant", cuisineTag: "Tamil", address: "TTK Road, Alwarpet, Chennai 600018", phone: "+91 98765 21006", rating: 4.5 },
  { slug: "amritsar-tandoor-hub", name: "Gurpreet Singh", orgName: "Amritsar Tandoor Hub", userType: "restaurant", cuisineTag: "Punjabi", address: "Lawrence Road, Amritsar 143001", phone: "+91 98765 21007", rating: 4.7 },
  { slug: "ahmedabad-thali-kitchen", name: "Hetal Shah", orgName: "Ahmedabad Thali Kitchen", userType: "restaurant", cuisineTag: "Gujarati", address: "CG Road, Navrangpura, Ahmedabad 380009", phone: "+91 98765 21008", rating: 4.4 },
  { slug: "kochi-coastal-pot", name: "Alan Joseph", orgName: "Kochi Coastal Pot", userType: "restaurant", cuisineTag: "Kerala", address: "Marine Drive, Ernakulam, Kochi 682031", phone: "+91 98765 21009", rating: 4.7 },
  { slug: "lucknow-awadhi-table", name: "Sana Rizvi", orgName: "Lucknow Awadhi Table", userType: "restaurant", cuisineTag: "Awadhi", address: "Hazratganj Main Road, Lucknow 226001", phone: "+91 98765 21010", rating: 4.8 },
];

const ngoSeed = [
  { slug: "annapurna-relief-trust", name: "Neha Kulkarni", orgName: "Annapurna Relief Trust", userType: "ngo", address: "Dadar East Community Centre, Mumbai 400014", phone: "+91 98765 22001" },
  { slug: "seva-food-network", name: "Rahul Bhattacharya", orgName: "Seva Food Network", userType: "ngo", address: "Ballygunge Circular Road, Kolkata 700019", phone: "+91 98765 22002" },
  { slug: "hope-meals-foundation", name: "Farah Ahmed", orgName: "Hope Meals Foundation", userType: "ngo", address: "Banjara Hills Road 1, Hyderabad 500034", phone: "+91 98765 22003" },
  { slug: "udaan-community-kitchen", name: "Kiran Nair", orgName: "Udaan Community Kitchen", userType: "ngo", address: "Koramangala 5th Block, Bengaluru 560095", phone: "+91 98765 22004" },
];

const customerSeed = [
  { slug: "ananya-sen", name: "Ananya Sen", userType: "customer", address: "Salt Lake Sector V, Kolkata 700091", phone: "+91 98765 23001", walletBalance: 540, rewardsPoints: 180 },
  { slug: "rohan-mehta", name: "Rohan Mehta", userType: "customer", address: "Andheri West, Mumbai 400053", phone: "+91 98765 23002", walletBalance: 760, rewardsPoints: 260 },
  { slug: "isha-reddy", name: "Isha Reddy", userType: "customer", address: "Madhapur, Hyderabad 500081", phone: "+91 98765 23003", walletBalance: 420, rewardsPoints: 145 },
  { slug: "karan-batra", name: "Karan Batra", userType: "customer", address: "Rajouri Garden, New Delhi 110027", phone: "+91 98765 23004", walletBalance: 610, rewardsPoints: 205 },
  { slug: "pooja-iyer", name: "Pooja Iyer", userType: "customer", address: "Mylapore, Chennai 600004", phone: "+91 98765 23005", walletBalance: 890, rewardsPoints: 320 },
  { slug: "vivek-sharma", name: "Vivek Sharma", userType: "customer", address: "Civil Lines, Jaipur 302006", phone: "+91 98765 23006", walletBalance: 500, rewardsPoints: 160 },
  { slug: "megha-joseph", name: "Megha Joseph", userType: "customer", address: "Vyttila, Kochi 682019", phone: "+91 98765 23007", walletBalance: 670, rewardsPoints: 240 },
  { slug: "aditya-patel", name: "Aditya Patel", userType: "customer", address: "Satellite, Ahmedabad 380015", phone: "+91 98765 23008", walletBalance: 455, rewardsPoints: 150 },
];

const dishSeed = [
  ["dilli-zaika-junction", "Butter Chicken", "indian", false, 360, 219, 40, "Rich tomato gravy with smoky tandoor chicken."],
  ["dilli-zaika-junction", "Dal Makhani", "indian", true, 290, 169, 42, "Slow-cooked black lentils finished with cream and butter."],
  ["dilli-zaika-junction", "Chole Bhature", "fast-food", true, 220, 129, 32, "Delhi-style chickpea curry with fluffy bhature."],
  ["dilli-zaika-junction", "Paneer Butter Masala", "indian", true, 320, 189, 38, "Creamy paneer curry with mild spice and kasuri methi."],
  ["dilli-zaika-junction", "Aloo Paratha", "healthy", true, 180, 99, 30, "Stuffed whole-wheat paratha with spiced potatoes."],
  ["dilli-zaika-junction", "Rajma Chawal", "healthy", true, 210, 119, 34, "Comforting kidney bean curry served with steamed rice."],
  ["dilli-zaika-junction", "Naan", "other", true, 70, 39, 28, "Fresh tandoor naan brushed with butter."],
  ["dilli-zaika-junction", "Gulab Jamun", "dessert", true, 160, 89, 36, "Soft khoya dumplings soaked in cardamom syrup."],

  ["hyderabad-dum-house", "Hyderabadi Biryani", "indian", false, 390, 239, 44, "Long-grain biryani layered with fragrant masala and herbs."],
  ["hyderabad-dum-house", "Chicken 65", "fast-food", false, 260, 149, 33, "Crispy, spicy fried chicken with curry leaf tempering."],
  ["hyderabad-dum-house", "Mirchi ka Salan", "indian", true, 210, 119, 35, "Peanut-sesame gravy with mildly roasted green chillies."],
  ["hyderabad-dum-house", "Double ka Meetha", "dessert", true, 170, 95, 38, "Bread pudding finished with saffron milk and nuts."],
  ["hyderabad-dum-house", "Haleem", "indian", false, 330, 199, 31, "Slow-cooked wheat, lentil and meat stew."],
  ["hyderabad-dum-house", "Keema", "indian", false, 310, 185, 32, "Spiced minced meat cooked with onions and green peas."],
  ["hyderabad-dum-house", "Shahi Tukda", "dessert", true, 180, 105, 37, "Royal bread sweet with rabri and toasted nuts."],
  ["hyderabad-dum-house", "Bagara Baingan", "indian", true, 240, 139, 36, "Stuffed baby eggplant in a nutty Hyderabadi gravy."],

  ["bengaluru-breakfast-co", "Masala Dosa", "healthy", true, 180, 99, 30, "Crisp dosa rolled around a turmeric potato filling."],
  ["bengaluru-breakfast-co", "Idli", "healthy", true, 130, 75, 28, "Soft steamed rice cakes served with chutney."],
  ["bengaluru-breakfast-co", "Medu Vada", "fast-food", true, 150, 89, 29, "Golden urad dal fritters with coconut chutney."],
  ["bengaluru-breakfast-co", "Bisi Bele Bath", "healthy", true, 210, 119, 31, "Rice-lentil one-pot meal with vegetables and ghee."],
  ["bengaluru-breakfast-co", "Pesarattu", "healthy", true, 190, 109, 30, "Moong dal crepe with ginger and green chilli."],
  ["bengaluru-breakfast-co", "Upma", "healthy", true, 140, 79, 27, "Savory semolina breakfast with vegetables and curry leaves."],
  ["bengaluru-breakfast-co", "Pongal", "healthy", true, 170, 95, 29, "Peppery rice and moong dal comfort bowl."],
  ["bengaluru-breakfast-co", "Rava Dosa", "healthy", true, 200, 115, 30, "Lacy semolina dosa with pepper and cumin."],

  ["mumbai-street-kitchen", "Vada Pav", "fast-food", true, 90, 49, 26, "Mumbai potato fritter sandwich with dry garlic chutney."],
  ["mumbai-street-kitchen", "Pav Bhaji", "fast-food", true, 180, 105, 28, "Buttery griddled pav with mashed vegetable bhaji."],
  ["mumbai-street-kitchen", "Misal Pav", "fast-food", true, 190, 109, 27, "Spicy sprout curry topped with farsan and onions."],
  ["mumbai-street-kitchen", "Pani Puri", "fast-food", true, 110, 65, 24, "Crisp puris served with tangy pani and potato filling."],
  ["mumbai-street-kitchen", "Bhel Puri", "fast-food", true, 120, 69, 24, "Puffed rice chaat with chutneys and sev."],
  ["mumbai-street-kitchen", "Pakora", "fast-food", true, 130, 75, 26, "Crunchy gram flour fritters with masala tea vibes."],
  ["mumbai-street-kitchen", "Ragda Pattice", "fast-food", true, 160, 89, 25, "Potato patties with white pea ragda and chutneys."],
  ["mumbai-street-kitchen", "Sabudana Khichdi", "healthy", true, 170, 99, 27, "Tapioca pearls tossed with peanuts and potatoes."],

  ["kolkata-kathi-corner", "Kati Roll", "fast-food", false, 180, 109, 29, "Classic Kolkata paratha roll with smoky filling."],
  ["kolkata-kathi-corner", "Kosha Mangsho", "indian", false, 350, 209, 38, "Slow-cooked Bengali mutton curry with deep caramel notes."],
  ["kolkata-kathi-corner", "Macher Jhol", "indian", false, 280, 169, 34, "Light Bengali fish curry with potatoes and mustard oil."],
  ["kolkata-kathi-corner", "Luchi", "other", true, 110, 65, 26, "Fluffy Bengali fried bread, ideal with potato curry."],
  ["kolkata-kathi-corner", "Aloor Dum", "indian", true, 190, 109, 32, "Spiced baby potato curry with Bengali-style finish."],
  ["kolkata-kathi-corner", "Rasgulla", "dessert", true, 160, 89, 35, "Soft chenna dumplings in light syrup."],
  ["kolkata-kathi-corner", "Sandesh", "dessert", true, 170, 95, 35, "Fresh Bengali milk sweet with delicate sweetness."],
  ["kolkata-kathi-corner", "Mishti Doi", "dessert", true, 140, 79, 34, "Caramelized sweet yogurt served chilled."],

  ["chennai-curry-club", "Appam", "healthy", true, 150, 89, 28, "Lacy fermented hopper with a soft center."],
  ["chennai-curry-club", "Chettinad Chicken", "indian", false, 340, 205, 35, "Pepper-forward Chettinad curry with roasted spices."],
  ["chennai-curry-club", "Lemon Rice", "healthy", true, 160, 89, 29, "Tempered rice with lemon, peanuts and curry leaves."],
  ["chennai-curry-club", "Curd Rice", "healthy", true, 150, 85, 27, "Cooling rice bowl with curd and mustard tempering."],
  ["chennai-curry-club", "Pongal", "healthy", true, 165, 95, 28, "Savory pongal with black pepper and cashews."],
  ["chennai-curry-club", "Medu Vada", "fast-food", true, 150, 89, 25, "South Indian lentil doughnuts with sambar."],
  ["chennai-curry-club", "Sambar Rice", "healthy", true, 180, 99, 29, "Rice simmered with sambar lentils and vegetables."],
  ["chennai-curry-club", "Payasam", "dessert", true, 150, 85, 34, "Festive milk dessert with vermicelli and nuts."],

  ["amritsar-tandoor-hub", "Tandoori Chicken", "indian", false, 360, 219, 36, "Charred chicken marinated in curd and spices."],
  ["amritsar-tandoor-hub", "Sarson ka Saag", "healthy", true, 260, 149, 39, "Slow-cooked mustard greens with Punjabi makkhan."],
  ["amritsar-tandoor-hub", "Makki ki Roti", "other", true, 90, 49, 30, "Rustic maize flatbread served warm off the griddle."],
  ["amritsar-tandoor-hub", "Chana Masala", "indian", true, 210, 119, 34, "Bold chickpea curry with North Indian spices."],
  ["amritsar-tandoor-hub", "Paneer Tikka", "fast-food", true, 260, 149, 31, "Grilled paneer cubes with capsicum and onions."],
  ["amritsar-tandoor-hub", "Kulcha", "fast-food", true, 120, 69, 28, "Stuffed Amritsari kulcha brushed with butter."],
  ["amritsar-tandoor-hub", "Phirni", "dessert", true, 150, 85, 33, "Creamy ground-rice pudding served chilled."],
  ["amritsar-tandoor-hub", "Lassi", "dessert", true, 130, 75, 24, "Thick sweet lassi with malai on top."],

  ["ahmedabad-thali-kitchen", "Dhokla", "healthy", true, 140, 79, 28, "Steamed gram flour cakes with mustard tempering."],
  ["ahmedabad-thali-kitchen", "Khandvi", "healthy", true, 150, 85, 28, "Silky gram flour rolls with coconut garnish."],
  ["ahmedabad-thali-kitchen", "Thepla", "healthy", true, 130, 75, 30, "Fenugreek flatbread made for travel-friendly meals."],
  ["ahmedabad-thali-kitchen", "Undhiyu", "indian", true, 280, 169, 37, "Winter Gujarati mixed vegetable delicacy."],
  ["ahmedabad-thali-kitchen", "Handvo", "healthy", true, 170, 99, 31, "Savory lentil-rice cake with bottle gourd."],
  ["ahmedabad-thali-kitchen", "Patra", "healthy", true, 160, 89, 29, "Colocasia leaves layered with gram flour masala."],
  ["ahmedabad-thali-kitchen", "Sev Tameta", "indian", true, 190, 109, 33, "Gujarati tomato curry topped with crunchy sev."],
  ["ahmedabad-thali-kitchen", "Shrikhand", "dessert", true, 160, 89, 35, "Hung curd dessert scented with saffron and cardamom."],

  ["kochi-coastal-pot", "Kerala Fish Curry", "indian", false, 330, 199, 35, "Tangy coconut fish curry with Kodampuli depth."],
  ["kochi-coastal-pot", "Appam with Stew", "healthy", false, 290, 169, 32, "Soft appam with mildly spiced Kerala-style stew."],
  ["kochi-coastal-pot", "Malabar Parotta", "other", true, 110, 59, 28, "Layered flaky flatbread folded hot from the tawa."],
  ["kochi-coastal-pot", "Puttu", "healthy", true, 150, 85, 30, "Steamed rice cylinders with coconut layers."],
  ["kochi-coastal-pot", "Avial", "healthy", true, 220, 129, 33, "Mixed vegetables in coconut-yogurt masala."],
  ["kochi-coastal-pot", "Thalassery Biryani", "indian", false, 370, 225, 42, "Kerala biryani with short-grain rice and warm spices."],
  ["kochi-coastal-pot", "Parippu Curry", "healthy", true, 180, 99, 31, "Kerala moong dal curry with coconut and ghee."],
  ["kochi-coastal-pot", "Ada Pradhaman", "dessert", true, 170, 95, 35, "Jaggery-coconut milk dessert with rice flakes."],

  ["lucknow-awadhi-table", "Galouti Kebab", "fast-food", false, 320, 189, 30, "Silken minced meat kebabs inspired by Awadhi dastarkhwan."],
  ["lucknow-awadhi-table", "Nihari", "indian", false, 340, 205, 34, "Slow-braised meat curry with deep warming spices."],
  ["lucknow-awadhi-table", "Awadhi Biryani", "indian", false, 380, 229, 43, "Delicately spiced biryani with fragrant kewra notes."],
  ["lucknow-awadhi-table", "Sheermal", "other", true, 110, 65, 29, "Saffron-flushed sweet flatbread baked soft."],
  ["lucknow-awadhi-table", "Korma", "indian", false, 310, 185, 36, "Royal-style curry with yogurt and whole spices."],
  ["lucknow-awadhi-table", "Shami Kebab", "fast-food", false, 260, 149, 28, "Pan-seared lentil-meat patties with herbs."],
  ["lucknow-awadhi-table", "Kheer", "dessert", true, 150, 85, 34, "Creamy rice pudding finished with nuts."],
  ["lucknow-awadhi-table", "Roomali Roti", "other", true, 90, 49, 27, "Ultra-thin handkerchief bread folded soft and warm."],
];

function categoryType(category) {
  if (category === "dessert") return "dessert";
  if (category === "fast-food") return "street-food";
  if (category === "healthy") return "light-meal";
  if (category === "other") return "bread";
  return "main-course";
}

function findFoodItem(foodItems, restaurantSlug, itemName) {
  return foodItems.find(
    (entry) => entry.restaurantSlug === restaurantSlug && entry.name === itemName
  );
}

async function buildSeedState() {
  const restaurants = [];
  const ngos = [];
  const customers = [];

  for (const profile of [...restaurantsSeed, ...ngoSeed, ...customerSeed]) {
    const account = await createAccount(profile);
    if (profile.userType === "restaurant") restaurants.push(account);
    else if (profile.userType === "ngo") ngos.push(account);
    else customers.push(account);
    console.log(`Created ${profile.userType}: ${profile.name}`);
  }

  const writerToken = await getWriterToken(restaurants[0].email);
  const restaurantMap = Object.fromEntries(restaurants.map((entry) => [entry.slug, entry]));
  const ngoMap = Object.fromEntries(ngos.map((entry) => [entry.slug, entry]));
  const customerMap = Object.fromEntries(customers.map((entry) => [entry.slug, entry]));
  const foodItems = [];
  const imageDocs = [];

  for (let index = 0; index < dishSeed.length; index += 1) {
    const [restaurantSlug, name, category, isVeg, originalPrice, discountedPrice, expiryHours, description] = dishSeed[index];
    const restaurant = restaurantMap[restaurantSlug];
    try {
      const wikipedia = await wikipediaThumbnail(name);
      const imageDataUrl = await imageUrlToDataUrl(wikipedia.imageUrl);
      const imageId = `img-${slugify(restaurantSlug)}-${String(index + 1).padStart(3, "0")}`;
      const foodId = `food-${slugify(name)}-${String(index + 1).padStart(3, "0")}`;
      const createdAt = addHours(baseTime, -72 + index);
      const updatedAt = addMinutes(createdAt, 30);
      const expiryTime = addHours(createdAt, expiryHours);

      await firestoreWrite(writerToken, `images/${imageId}`, {
        data: imageDataUrl,
        sourceUrl: wikipedia.imageUrl,
        sourcePage: wikipedia.pageUrl,
        createdAt,
      });

      await firestoreWrite(writerToken, `foodItems/${foodId}`, {
        restaurantId: restaurant.uid,
        restaurantName: restaurant.orgName,
        name,
        description,
        category,
        originalPrice,
        discountedPrice,
        quantity: 4 + (index % 8),
        expiryHours,
        expiryTime,
        batchId: `LB-${runTag}-${String(index + 1).padStart(4, "0")}`,
        rating: Number((4.2 + (index % 5) * 0.1).toFixed(1)),
        isAvailable: true,
        isDonation: false,
        isVeg,
        foodImageId: imageId,
        imageSourcePage: wikipedia.pageUrl,
        createdAt,
        updatedAt,
      });

      imageDocs.push({ imageId, source: wikipedia.pageUrl, foodId, name });
      foodItems.push({
        id: foodId,
        imageId,
        restaurantId: restaurant.uid,
        restaurantName: restaurant.orgName,
        restaurantSlug,
        name,
        category,
        type: categoryType(category),
        isVeg,
        originalPrice,
        discountedPrice,
        expiryHours,
        description,
        createdAt,
        updatedAt,
        expiryTime,
      });

      console.log(`Seeded food ${foodItems.length}/${dishSeed.length}: ${name}`);
    } catch (error) {
      console.warn(`Skipped ${name}: ${error.message}`);
    }
  }

  const orderSeed = [
    ["ananya-sen", "dilli-zaika-junction", ["Butter Chicken", "Naan"], "confirmed", 59, 0],
    ["rohan-mehta", "mumbai-street-kitchen", ["Vada Pav", "Pav Bhaji"], "ready", 46, 40],
    ["isha-reddy", "hyderabad-dum-house", ["Hyderabadi Biryani"], "pending", 18, 0],
    ["karan-batra", "dilli-zaika-junction", ["Chole Bhature", "Gulab Jamun"], "picked_up", 72, 60],
    ["pooja-iyer", "chennai-curry-club", ["Appam", "Chettinad Chicken"], "confirmed", 34, 30],
    ["vivek-sharma", "amritsar-tandoor-hub", ["Paneer Tikka", "Lassi"], "pending", 14, 0],
    ["megha-joseph", "kochi-coastal-pot", ["Kerala Fish Curry", "Malabar Parotta"], "ready", 27, 50],
    ["aditya-patel", "ahmedabad-thali-kitchen", ["Dhokla", "Undhiyu"], "picked_up", 66, 35],
    ["ananya-sen", "kolkata-kathi-corner", ["Kati Roll", "Mishti Doi"], "confirmed", 21, 20],
    ["rohan-mehta", "lucknow-awadhi-table", ["Galouti Kebab", "Kheer"], "pending", 9, 0],
    ["isha-reddy", "hyderabad-dum-house", ["Chicken 65", "Shahi Tukda"], "cancelled", 41, 30],
    ["karan-batra", "amritsar-tandoor-hub", ["Tandoori Chicken"], "ready", 16, 25],
  ];

  const orders = [];
  for (let index = 0; index < orderSeed.length; index += 1) {
    const [customerSlug, restaurantSlug, itemNames, status, hoursAgo, walletUsed] = orderSeed[index];
    const customer = customerMap[customerSlug];
    const restaurant = restaurantMap[restaurantSlug];
    const selectedItems = itemNames
      .map((itemName) => findFoodItem(foodItems, restaurantSlug, itemName))
      .filter(Boolean)
      .map((item) => ({ foodItemId: item.id, name: item.name, price: item.discountedPrice, quantity: 1 }));
    if (!selectedItems.length) continue;
    const subtotal = selectedItems.reduce((sum, item) => sum + item.price, 0);
    const createdAt = addHours(baseTime, -hoursAgo);
    const updatedAt = addMinutes(createdAt, 25);
    const orderId = `order-${String(index + 1).padStart(3, "0")}`;
    const order = {
      customerId: customer.uid,
      customerName: customer.name,
      restaurantId: restaurant.uid,
      restaurantName: restaurant.orgName,
      items: selectedItems,
      subtotal,
      discount: 0,
      total: subtotal,
      walletUsed,
      cashback: Math.round(subtotal * 0.03),
      status,
      pickupTime: addMinutes(createdAt, 90).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      address: customer.address,
      trainDelivery: null,
      createdAt,
      updatedAt,
    };
    await firestoreWrite(writerToken, `orders/${orderId}`, order);
    orders.push({ id: orderId, ...order });
  }

  const donationSeed = [
    ["donation-001", "amritsar-tandoor-hub", "annapurna-relief-trust", ["Paneer Tikka", "Chana Masala"], "accepted", 6],
    ["donation-002", "kochi-coastal-pot", "udaan-community-kitchen", ["Avial", "Puttu"], "picked_up", 5],
    ["donation-003", "kolkata-kathi-corner", "seva-food-network", ["Luchi", "Aloor Dum"], "accepted", 7],
    ["donation-004", "hyderabad-dum-house", "hope-meals-foundation", ["Mirchi ka Salan", "Bagara Baingan"], "pending", 8],
    ["donation-005", "bengaluru-breakfast-co", "udaan-community-kitchen", ["Idli", "Upma"], "picked_up", 4],
    ["donation-006", "ahmedabad-thali-kitchen", "annapurna-relief-trust", ["Dhokla", "Khandvi"], "pending", 9],
  ];

  const donations = [];
  const qualityScans = [];

  for (let index = 0; index < donationSeed.length; index += 1) {
    const [donationId, restaurantSlug, ngoSlug, itemNames, status, expiryHours] = donationSeed[index];
    const restaurant = restaurantMap[restaurantSlug];
    const ngo = ngoMap[ngoSlug];
    const relatedItems = itemNames
      .map((itemName) => findFoodItem(foodItems, restaurantSlug, itemName))
      .filter(Boolean);
    if (!relatedItems.length) continue;
    const createdAt = addHours(baseTime, -(12 + index * 3));
    const donation = {
      restaurantId: restaurant.uid,
      restaurantName: restaurant.orgName,
      restaurantAddress: restaurant.address,
      restaurantPhone: restaurant.phone,
      restaurantEmail: restaurant.email,
      items: itemNames.join(", "),
      quantity: itemNames.length * 6,
      estimatedServings: itemNames.length * 10,
      pickupWindow: addMinutes(createdAt, 180).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      expiryHours,
      ngoId: status === "pending" ? null : ngo.uid,
      ngoName: status === "pending" ? null : ngo.name,
      ngoOrgName: status === "pending" ? null : ngo.orgName,
      status,
      declinedBy: [],
      createdAt,
      updatedAt: addMinutes(createdAt, 45),
      restaurantScanId: `scan-restaurant-${String(index + 1).padStart(3, "0")}`,
      restaurantQualityStatus: index % 4 === 3 ? "semi-rotten" : "fresh",
    };

    if (status !== "pending") {
      donation.acceptedAt = addMinutes(createdAt, 20);
      donation.ngoScanId = `scan-ngo-${String(index + 1).padStart(3, "0")}`;
      donation.ngoQualityStatus = status === "picked_up" ? "fresh" : "semi-rotten";
    }

    await firestoreWrite(writerToken, `donations/${donationId}`, donation);

    const restaurantScan = {
      donationId,
      uploadedBy: "restaurant",
      uploaderId: restaurant.uid,
      uploaderName: restaurant.name,
      imageId: relatedItems[0].imageId,
      imageUrl: null,
      heatmapUrl: null,
      freshnessScore: 82 - index * 4,
      spoilagePercent: 18 + index * 4,
      status: donation.restaurantQualityStatus,
      statusLabel: donation.restaurantQualityStatus === "fresh" ? "Verified Fresh" : "Needs Review",
      isFoodDetected: true,
      topClassification: relatedItems[0].name,
      classificationConfidence: 84 - index * 2,
      spoilageIndicators: { darkSpots: 6 + index, moldRisk: 4 + index, mushiness: 8 + index, bacteria: 3 + index },
      metadata: { temperature: 23 + index, daysOld: 0, storageType: "fridge", supportedFoodType: true, datasetMatched: false, classificationMode: "seeded-demo" },
      predictions: [{ label: relatedItems[0].name, confidence: 84 - index * 2 }, { label: itemNames[1] || relatedItems[0].name, confidence: 69 - index }],
      createdAt,
    };
    await firestoreWrite(writerToken, `qualityScans/${donation.restaurantScanId}`, restaurantScan);
    qualityScans.push({ id: donation.restaurantScanId, ...restaurantScan });

    if (status !== "pending") {
      const ngoScan = {
        donationId,
        uploadedBy: "ngo",
        uploaderId: ngo.uid,
        uploaderName: ngo.name,
        imageId: relatedItems[relatedItems.length - 1].imageId,
        imageUrl: null,
        heatmapUrl: null,
        freshnessScore: status === "picked_up" ? 79 : 74,
        spoilagePercent: status === "picked_up" ? 21 : 26,
        status: donation.ngoQualityStatus,
        statusLabel: donation.ngoQualityStatus === "fresh" ? "Verified Fresh" : "Needs Review",
        isFoodDetected: true,
        topClassification: relatedItems[relatedItems.length - 1].name,
        classificationConfidence: 78,
        spoilageIndicators: { darkSpots: 7 + index, moldRisk: 5 + index, mushiness: 10 + index, bacteria: 4 + index },
        metadata: { temperature: 24 + index, daysOld: 0, storageType: "room", supportedFoodType: true, datasetMatched: false, classificationMode: "seeded-demo" },
        predictions: itemNames.map((itemName, itemIndex) => ({ label: itemName, confidence: 78 - itemIndex * 7 })),
        createdAt: addMinutes(createdAt, 75),
      };
      await firestoreWrite(writerToken, `qualityScans/${donation.ngoScanId}`, ngoScan);
      qualityScans.push({ id: donation.ngoScanId, ...ngoScan });
    }

    donations.push({ id: donationId, ...donation });
  }

  const transactionSeed = [
    ["ananya-sen", 1200, "Wallet top-up", "topup", null, 820, 92], ["ananya-sen", -280, "Order #001", "order", "order-001", 540, 58],
    ["rohan-mehta", 1500, "Wallet top-up", "topup", null, 1100, 96], ["rohan-mehta", -340, "Order #002", "order", "order-002", 760, 47],
    ["isha-reddy", 1000, "Wallet top-up", "topup", null, 670, 72], ["isha-reddy", -250, "Order #003", "order", "order-003", 420, 16],
    ["karan-batra", 1300, "Wallet top-up", "topup", null, 860, 88], ["karan-batra", -250, "Order #004", "order", "order-004", 610, 65],
    ["pooja-iyer", 1600, "Wallet top-up", "topup", null, 1050, 90], ["pooja-iyer", -160, "Order #005", "order", "order-005", 890, 33],
    ["vivek-sharma", 900, "Wallet top-up", "topup", null, 650, 55], ["vivek-sharma", -150, "Order #006", "order", "order-006", 500, 12],
    ["megha-joseph", 1200, "Wallet top-up", "topup", null, 920, 61], ["megha-joseph", -250, "Order #007", "order", "order-007", 670, 25],
    ["aditya-patel", 950, "Wallet top-up", "topup", null, 635, 50], ["aditya-patel", -180, "Order #008", "order", "order-008", 455, 17],
  ];

  for (let index = 0; index < transactionSeed.length; index += 1) {
    const [customerSlug, amount, description, source, orderId, balance, hoursAgo] = transactionSeed[index];
    await firestoreWrite(writerToken, `transactions/txn-${String(index + 1).padStart(3, "0")}`, {
      userId: customerMap[customerSlug].uid,
      type: amount >= 0 ? "credit" : "debit",
      amount: Math.abs(amount),
      description,
      source,
      balance,
      orderId,
      createdAt: addHours(baseTime, -hoursAgo),
    });
  }

  const alertSeed = [
    ["ananya-sen", "Gulab Jamun", 79], ["rohan-mehta", "Pani Puri", 55], ["isha-reddy", "Hyderabadi Biryani", 210], ["karan-batra", "Paneer Tikka", 135],
    ["pooja-iyer", "Appam", 79], ["vivek-sharma", "Tandoori Chicken", 199], ["megha-joseph", "Kerala Fish Curry", 179], ["aditya-patel", "Undhiyu", 149],
  ];

  for (let index = 0; index < alertSeed.length; index += 1) {
    const [customerSlug, itemName, targetPrice] = alertSeed[index];
    const item = foodItems.find((entry) => entry.name === itemName);
    if (!item) continue;
    await firestoreWrite(writerToken, `stockAlerts/alert-${String(index + 1).padStart(3, "0")}`, {
      userId: customerMap[customerSlug].uid,
      foodItemId: item.id,
      foodItemName: item.name,
      targetPrice,
      currentPrice: item.discountedPrice,
      status: index % 5 === 0 ? "triggered" : "active",
      createdAt: addHours(baseTime, -(18 + index)),
      triggeredAt: index % 5 === 0 ? addHours(baseTime, -(4 + index)) : null,
    });
  }

  for (const restaurant of restaurants) {
    const totalOrders = orders.filter((entry) => entry.restaurantId === restaurant.uid).length;
    await firestoreWrite(writerToken, `restaurants/${restaurant.uid}`, {
      ownerId: restaurant.uid,
      name: restaurant.orgName,
      email: restaurant.email,
      address: restaurant.address,
      phone: restaurant.phone,
      isPartner: true,
      isActive: true,
      rating: restaurant.rating,
      totalOrders,
      cuisineTag: restaurant.cuisineTag,
      createdAt: addHours(baseTime, -96),
      updatedAt: baseTime,
    });
  }

  for (const ngo of ngos) {
    const accepted = donations.filter((entry) => entry.ngoId === ngo.uid && entry.status !== "pending");
    await firestoreWrite(writerToken, `ngos/${ngo.uid}`, {
      ownerId: ngo.uid,
      name: ngo.orgName,
      email: ngo.email,
      address: ngo.address,
      phone: ngo.phone,
      totalDonationsReceived: accepted.length,
      mealsServed: accepted.reduce((sum, entry) => sum + entry.estimatedServings, 0),
      isVerified: true,
      createdAt: addHours(baseTime, -96),
      updatedAt: baseTime,
    });
  }

  const summary = {
    projectId,
    runTag,
    password,
    counts: {
      restaurants: restaurants.length,
      ngos: ngos.length,
      customers: customers.length,
      foodItems: foodItems.length,
      images: imageDocs.length,
      orders: orders.length,
      donations: donations.length,
      qualityScans: qualityScans.length,
      transactions: transactionSeed.length,
      stockAlerts: alertSeed.length,
    },
    loginSamples: {
      restaurant: { email: restaurants[0].email, password, name: restaurants[0].orgName },
      ngo: { email: ngos[0].email, password, name: ngos[0].orgName },
      customer: { email: customers[0].email, password, name: customers[0].name },
    },
    sources: "Wikipedia search API thumbnails for Indian dishes",
  };

  await fs.mkdir(path.dirname(summaryPath), { recursive: true });
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

buildSeedState().catch((error) => {
  console.error(error);
  process.exit(1);
});
