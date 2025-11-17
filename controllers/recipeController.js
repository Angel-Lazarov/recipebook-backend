// controllers/recipeController.js

import db from "../db/firestore.js";
import { Timestamp } from "firebase-admin/firestore";
import { uploadFile, deleteFile } from "../services/r2Service.js"; // новият сървис

const MAX_UPLOAD_FILES = 20; // максимум снимки за еднократен upload (multer)
const MAX_IMAGES_PER_RECIPE = 15; // бизнес правило: максимум снимки на рецепта

/// POST /recipes
export async function createRecipe(req, res) {
  try {
    const { title, category, ingredients, instructions } = req.body;
    if (!title || !category || !ingredients || !instructions) {
      return res.status(400).json({ error: "Всички полета са задължителни" });
    }

    const userId = req.user.userId;
    const default_img = "https://placehold.co/300x200/cccccc/ffffff?text=Без+снимка";

    const ingredientsArr = ingredients
      .split(",")
      .map(i => i.trim())
      .filter(Boolean);

    const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1).trim();

    // Унифициране на категорията
    const categorySnapshot = await db
      .collection("recipes")
      .where("category", "==", capitalize(category))
      .get();
    const finalCategory = categorySnapshot.empty
      ? capitalize(category)
      : categorySnapshot.docs[0].data().category;

    // Снимки
    let images = [default_img];
    if (req.files && req.files.length > 0) {
      const filesToUpload = req.files.slice(0, MAX_IMAGES_PER_RECIPE);
      images = await Promise.all(filesToUpload.map(file => uploadFile(file)));

      if (req.files.length > MAX_IMAGES_PER_RECIPE) {
        console.warn(`Потребителят е качил повече от ${MAX_IMAGES_PER_RECIPE} снимки, обработват се само първите.`);
      }
    }

    const newRecipe = {
      title: capitalize(title),
      category: finalCategory,
      ingredients: ingredientsArr,
      instructions,
      authorId: userId,
      images,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await db.collection("recipes").add(newRecipe);

    res.status(201).json({
      message: "Рецептата е създадена успешно",
      id: docRef.id,
      recipe: newRecipe,
    });
  } catch (err) {
    console.error("Грешка при създаването на рецепта:", err);
    res.status(500).json({ error: "Вътрешна грешка на сървъра" });
  }
}

/// PUT /recipes/:id
export async function updateRecipe(req, res) {
  try {
    const id = req.params.id;
    const { title, category, ingredients, instructions } = req.body;

    if (!title || !category || !ingredients || !instructions) {
      return res.status(400).json({ error: "Всички полета са задължителни!" });
    }

    const docRef = db.collection("recipes").doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Рецептата не е намерена!" });

    const recipe = docSnap.data();
    if (recipe.authorId !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Нямате права да редактирате тази рецепта!" });
    }

    const ingredientsArr = ingredients.split(",").map(i => i.trim()).filter(Boolean);
    const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1).trim();

    // Унифициране на категория
    const categorySnapshot = await db
      .collection("recipes")
      .where("category", "==", capitalize(category))
      .get();
    const finalCategory = categorySnapshot.empty
      ? capitalize(category)
      : categorySnapshot.docs[0].data().category;

    const PLACEHOLDER_URL = "https://placehold.co/300x200/cccccc/ffffff?text=Без+снимка";
    let originalUrls = Array.isArray(recipe.images) ? [...recipe.images] : [];

    // 1) Премахване на снимки
    let removedImages = req.body.removedImages || [];
    if (!Array.isArray(removedImages)) removedImages = [removedImages];
    for (const url of removedImages) {
      if (!url.includes("placehold.co")) {
        try { await deleteFile(url); }
        catch (err) { console.error("Грешка при изтриване на R2 изображение:", url, err); }
      }
    }
    originalUrls = originalUrls.filter(url => !removedImages.includes(url));

    // 2) Добавяне на нови файлове
    if (req.files && req.files.length > 0) {
      const availableSlots = MAX_IMAGES_PER_RECIPE - originalUrls.length;
      const filesToUpload = req.files.slice(0, availableSlots);
      for (const file of filesToUpload) {
        const newUrl = await uploadFile(file);
        originalUrls.push(newUrl);
      }
      if (req.files.length > filesToUpload.length) {
        console.warn(`Превишен лимит за снимки. Добавени са само първите ${availableSlots}.`);
      }
    }

    const updatedRecipe = {
      title: capitalize(title),
      category: finalCategory,
      ingredients: ingredientsArr,
      instructions,
      images: originalUrls,
      authorId: recipe.authorId,
      createdAt: recipe.createdAt,
      updatedAt: Timestamp.now(),
    };

    await docRef.update(updatedRecipe);
    res.status(200).json({ message: "Рецептата е обновена успешно", recipe: updatedRecipe });

  } catch (err) {
    console.error("Грешка при обновяване на рецепта:", err);
    res.status(500).json({ error: "Вътрешна грешка на сървъра." });
  }
}

/// DELETE /recipes/:id
export async function deleteRecipe(req, res) {
  try {
    const id = req.params.id;
    const docRef = db.collection("recipes").doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Рецептата не е намерена." });

    const recipe = docSnap.data();
    if (recipe.authorId !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Нямате права за изтриване." });
    }

    if (recipe.images?.length > 0) {
      for (const url of recipe.images) {
        if (!url.includes("placehold.co")) {
          try { await deleteFile(url); }
          catch (err) { console.error("Грешка при изтриване на R2 изображение:", url, err); }
        }
      }
    }

    await docRef.delete();
    res.status(200).json({ message: "Рецептата е изтрита успешно!" });
  } catch (err) {
    console.error("Грешка при изтриване на рецепта:", err);
    res.status(500).json({ error: "Вътрешна грешка на сървъра!" });
  }
}

/// GET /recipes/mine
export async function getMyRecipes(req, res) {
  try {
    const userId = req.user.userId;
    const snapshot = await db.collection("recipes").where("authorId", "==", userId).get();

    if (snapshot.empty) return res.status(200).json({ message: "Няма създадени рецепти", recipes: [] });

    const recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(recipes);
  } catch (err) {
    console.error("Грешка при извличане на личните рецепти:", err);
    res.status(500).json({ error: "Вътрешна грешка на сървъра" });
  }
}

/// GET /recipes/:id
export async function getRecipeById(req, res) {
  try {
    const id = req.params.id;
    const docRef = db.collection("recipes").doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Рецептата не е намерена!" });

    const data = docSnap.data();
    res.status(200).json({
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate().toISOString(),
      updatedAt: data.updatedAt?.toDate().toISOString(),
    });
  } catch (err) {
    console.error("Грешка при извличане на рецептата:", err);
    res.status(500).json({ error: "Вътрешна грешка на сървъра." });
  }
}

/// GET /recipes
export async function getAllRecipes(req, res) {
  try {
    const snapshot = await db.collection("recipes").get();
    const recipes = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString(),
      };
    });
    res.json(recipes);
  } catch (err) {
    console.error("Грешка при взимане на рецепти:", err);
    res.status(500).json({ error: "Вътрешна грешка на сървъра" });
  }
}
