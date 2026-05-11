import { Scenes } from 'telegraf';
import { estimateCalories } from '../services/aiService.js';
import { addMeal } from '../database/db.js';

export const ADD_MEAL_WIZARD_ID = 'ADD_MEAL_WIZARD';

export const addMealWizard = new Scenes.WizardScene<Scenes.WizardContext>(
  ADD_MEAL_WIZARD_ID,
  async (ctx) => {
    await ctx.reply('🥗 Що ви зʼїли? (Наприклад: 2 яйця і тост)');
    return ctx.wizard.next();
  },
  async (ctx) => {
    const mealText = (ctx.message as any)?.text;
    if (!mealText) {
      await ctx.reply('❌ Будь ласка, введіть опис їжі текстом.');
      return;
    }

    await ctx.reply('🔍 Оцінюю калорії за допомогою AI...');

    const estimation = await estimateCalories(mealText);

    if (!estimation) {
      await ctx.reply('⚠️ Не вдалося проаналізувати їжу. Спробуйте описати простіше.');
      return ctx.scene.leave();
    }

    // Save to DB
    if (ctx.from) {
      addMeal(ctx.from.id, mealText, estimation.total_calories, JSON.stringify(estimation));
    }

    let response = `✅ Прийом їжі збережено!\n\n🔍 Знайдено:\n`;
    estimation.items.forEach((item) => {
      response += `• ${item.name} (${item.grams}г) — ${Math.round(item.calories)} ккал\n`;
    });
    response += `\n🔥 Разом: ${Math.round(estimation.total_calories)} ккал\n`;
    response += `🎯 Confidence: ${estimation.confidence.toFixed(2)}\n\n`;
    response += `_Примітка: це орієнтовна оцінка калорій._`;

    await ctx.reply(response, { parse_mode: 'Markdown' });

    return ctx.scene.leave();
  }
);
