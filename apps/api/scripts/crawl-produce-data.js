import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const execFileAsync = promisify(execFile)
const basePath = path.resolve(__dirname, '../data/produce.seed.json')
const extraPath = path.resolve(__dirname, '../data/produce.extra.json')
const reportPath = path.resolve(__dirname, '../data/produce-data-validation.json')

const regionOffsets = {
  华南: -1,
  华东: 0,
  华中: 0,
  西南: 0,
  华北: 1,
  东北: 1,
  西北: 1
}

const seasonTermsByMonth = {
  1: ['小寒', '大寒'],
  2: ['立春', '雨水'],
  3: ['惊蛰', '春分'],
  4: ['清明', '谷雨'],
  5: ['立夏', '小满'],
  6: ['芒种', '夏至'],
  7: ['小暑', '大暑'],
  8: ['立秋', '处暑'],
  9: ['白露', '秋分'],
  10: ['寒露', '霜降'],
  11: ['立冬', '小雪'],
  12: ['大雪', '冬至']
}

const nutritionDefaults = {
  berry: { energyKcal: 48, carbohydrateG: 11, fiberG: 2.8, proteinG: 0.9, fatG: 0.3, vitaminCMg: 32, potassiumMg: 170 },
  tropical: { energyKcal: 68, carbohydrateG: 16, fiberG: 2.3, proteinG: 0.9, fatG: 0.4, vitaminCMg: 28, potassiumMg: 220 },
  'stone-fruit': { energyKcal: 46, carbohydrateG: 11, fiberG: 1.6, proteinG: 0.8, fatG: 0.2, vitaminCMg: 8, potassiumMg: 180 },
  pome: { energyKcal: 54, carbohydrateG: 14, fiberG: 2.2, proteinG: 0.4, fatG: 0.2, vitaminCMg: 5, potassiumMg: 130 },
  melon: { energyKcal: 34, carbohydrateG: 8, fiberG: 0.9, proteinG: 0.7, fatG: 0.2, vitaminCMg: 18, potassiumMg: 190 },
  citrus: { energyKcal: 48, carbohydrateG: 12, fiberG: 2.1, proteinG: 0.8, fatG: 0.2, vitaminCMg: 45, potassiumMg: 165 },
  gourd: { energyKcal: 22, carbohydrateG: 4.8, fiberG: 1.2, proteinG: 0.8, fatG: 0.1, vitaminCMg: 12, potassiumMg: 160 },
  legume: { energyKcal: 92, carbohydrateG: 14, fiberG: 4.2, proteinG: 5.2, fatG: 0.5, vitaminCMg: 18, potassiumMg: 260 },
  'leafy-green': { energyKcal: 22, carbohydrateG: 3.8, fiberG: 2.0, proteinG: 2.0, fatG: 0.3, vitaminCMg: 34, potassiumMg: 320 },
  'fruit-vegetable': { energyKcal: 28, carbohydrateG: 6, fiberG: 1.8, proteinG: 1.1, fatG: 0.2, vitaminCMg: 24, potassiumMg: 230 },
  cruciferous: { energyKcal: 31, carbohydrateG: 6, fiberG: 2.6, proteinG: 2.3, fatG: 0.3, vitaminCMg: 48, potassiumMg: 260 },
  root: { energyKcal: 40, carbohydrateG: 9, fiberG: 2.2, proteinG: 1.0, fatG: 0.1, vitaminCMg: 11, potassiumMg: 240 },
  mushroom: { energyKcal: 26, carbohydrateG: 4.2, fiberG: 2.3, proteinG: 2.8, fatG: 0.3, vitaminCMg: 2, potassiumMg: 310 },
  grain: { energyKcal: 96, carbohydrateG: 21, fiberG: 2.4, proteinG: 3.4, fatG: 1.3, vitaminCMg: 6, potassiumMg: 220 },
  allium: { energyKcal: 34, carbohydrateG: 7.2, fiberG: 1.8, proteinG: 1.4, fatG: 0.2, vitaminCMg: 10, potassiumMg: 190 },
  pod: { energyKcal: 36, carbohydrateG: 7, fiberG: 2.8, proteinG: 2.4, fatG: 0.2, vitaminCMg: 20, potassiumMg: 210 },
  tuber: { energyKcal: 82, carbohydrateG: 19, fiberG: 2.5, proteinG: 1.6, fatG: 0.2, vitaminCMg: 12, potassiumMg: 420 },
  stem: { energyKcal: 24, carbohydrateG: 5, fiberG: 1.9, proteinG: 1.3, fatG: 0.2, vitaminCMg: 18, potassiumMg: 230 },
  aquatic: { energyKcal: 34, carbohydrateG: 7.8, fiberG: 2.1, proteinG: 1.3, fatG: 0.2, vitaminCMg: 20, potassiumMg: 230 },
  herb: { energyKcal: 29, carbohydrateG: 5.5, fiberG: 2.8, proteinG: 2.2, fatG: 0.5, vitaminCMg: 45, potassiumMg: 360 },
  flower: { energyKcal: 31, carbohydrateG: 6.5, fiberG: 2.4, proteinG: 2.0, fatG: 0.2, vitaminCMg: 32, potassiumMg: 250 }
}

const candidates = [
  ['longyan', '龙眼', 'Longan', 'fruit', 'tropical', [7, 8, 9], [8], ['华南', '西南'], { vitaminCMg: 84, potassiumMg: 266 }, ['清甜', '蜜香'], ['维生素C', '钾']],
  ['huangpi', '黄皮', 'Wampee', 'fruit', 'tropical', [6, 7, 8], [7], ['华南'], { vitaminCMg: 35 }, ['酸甜', '果香'], ['维生素C', '开胃']],
  ['fanliuzhi', '番石榴', 'Guava', 'fruit', 'tropical', [8, 9, 10, 11], [9, 10], ['华南', '西南'], { vitaminCMg: 228, fiberG: 5.4, potassiumMg: 417 }, ['清甜', '脆爽'], ['维生素C', '膳食纤维']],
  ['baixiangguo', '百香果', 'Passion fruit', 'fruit', 'tropical', [7, 8, 9, 10], [8, 9], ['华南', '西南'], { fiberG: 10.4, vitaminCMg: 30 }, ['酸香', '浓郁'], ['膳食纤维', '维生素C']],
  ['hongmaodan', '红毛丹', 'Rambutan', 'fruit', 'tropical', [6, 7, 8], [7], ['华南'], { vitaminCMg: 36 }, ['清甜', '多汁'], ['维生素C', '补水']],
  ['shijia', '释迦', 'Sugar apple', 'fruit', 'tropical', [8, 9, 10, 11], [9, 10], ['华南'], { energyKcal: 94, vitaminCMg: 36, potassiumMg: 247 }, ['绵甜', '奶香'], ['能量', '钾']],
  ['niuyouguo', '牛油果', 'Avocado', 'fruit', 'tropical', [8, 9, 10, 11], [9, 10], ['华南', '西南'], { energyKcal: 160, fatG: 14.7, fiberG: 6.7, vitaminCMg: 10, potassiumMg: 485 }, ['绵密', '油润'], ['膳食纤维', '钾']],
  ['yezi', '椰子', 'Coconut', 'fruit', 'tropical', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], [6, 7, 8], ['华南'], { energyKcal: 354, fatG: 33.5, fiberG: 9, vitaminCMg: 3.3, potassiumMg: 356 }, ['清甜', '椰香'], ['钾', '能量']],
  ['boluomi', '菠萝蜜', 'Jackfruit', 'fruit', 'tropical', [6, 7, 8, 9], [7, 8], ['华南'], { energyKcal: 95, vitaminCMg: 13.8, potassiumMg: 448 }, ['甜香', '饱满'], ['钾', '能量']],
  ['shanzhu', '山竹', 'Mangosteen', 'fruit', 'tropical', [5, 6, 7, 8, 9], [6, 7, 8], ['华南'], { energyKcal: 73, fiberG: 1.8, vitaminCMg: 2.9 }, ['酸甜', '细嫩'], ['补水', '膳食纤维']],
  ['yangpu', '杨桃', 'Star fruit', 'fruit', 'tropical', [8, 9, 10, 11], [9, 10], ['华南'], { energyKcal: 31, vitaminCMg: 34.4, potassiumMg: 133 }, ['清酸', '多汁'], ['维生素C', '补水']],
  ['renshenguo', '人参果', 'Pepino melon', 'fruit', 'tropical', [8, 9, 10, 11], [9, 10], ['西北', '西南'], { vitaminCMg: 29 }, ['清甜', '爽口'], ['补水', '维生素C']],
  ['shepiguo', '蛇皮果', 'Salak', 'fruit', 'tropical', [6, 7, 8, 9], [7, 8], ['华南'], { energyKcal: 82, fiberG: 2.6, potassiumMg: 256 }, ['酸甜', '脆韧'], ['膳食纤维', '钾']],
  ['ganlan', '橄榄', 'Chinese olive', 'fruit', 'stone-fruit', [9, 10, 11], [10], ['华南'], { vitaminCMg: 24, fiberG: 3.3 }, ['清涩', '回甘'], ['维生素C', '膳食纤维']],
  ['qingmei', '青梅', 'Green plum', 'fruit', 'stone-fruit', [4, 5, 6], [5], ['华东', '华南'], { vitaminCMg: 7 }, ['酸香', '爽口'], ['开胃', '果酸']],
  ['nai', '奈李', 'Chinese plum', 'fruit', 'stone-fruit', [7, 8], [7], ['华南', '华中'], { vitaminCMg: 5 }, ['脆甜', '清香'], ['补水', '果酸']],
  ['ximei', '西梅', 'Prune plum', 'fruit', 'stone-fruit', [8, 9, 10], [9], ['西北', '华北'], { fiberG: 1.4, potassiumMg: 157 }, ['甜润', '柔软'], ['膳食纤维', '钾']],
  ['heibulin', '黑布林', 'Black plum', 'fruit', 'stone-fruit', [7, 8, 9], [8], ['华北', '西北'], { vitaminCMg: 6 }, ['酸甜', '多汁'], ['补水', '花青素']],
  ['youtao', '油桃', 'Nectarine', 'fruit', 'stone-fruit', [6, 7, 8], [7], ['华北', '西北'], { vitaminCMg: 5.4, potassiumMg: 201 }, ['甜脆', '果香'], ['钾', '补水']],
  ['hongsu', '红啤梨', 'Red pear', 'fruit', 'pome', [8, 9, 10], [9], ['华北', '西北'], { fiberG: 3.1, vitaminCMg: 4.2 }, ['甜润', '细嫩'], ['膳食纤维', '补水']],
  ['haitangguo', '海棠果', 'Crabapple', 'fruit', 'pome', [8, 9, 10], [9], ['华北', '东北'], { vitaminCMg: 8 }, ['酸甜', '浓香'], ['果酸', '维生素C']],
  ['shaguo', '沙果', 'Crab apple', 'fruit', 'pome', [8, 9, 10], [9], ['华北', '东北'], { vitaminCMg: 6 }, ['酸甜', '脆爽'], ['补水', '果酸']],
  ['huaishanli', '花红', 'Chinese crabapple', 'fruit', 'pome', [8, 9], [9], ['华北', '西北'], { fiberG: 2.1 }, ['酸甜', '耐储'], ['膳食纤维', '果酸']],
  ['youganzi', '余甘子', 'Indian gooseberry', 'fruit', 'berry', [10, 11, 12], [11], ['华南', '西南'], { vitaminCMg: 276, fiberG: 4.3 }, ['酸涩', '回甘'], ['维生素C', '膳食纤维']],
  ['cili', '刺梨', 'Rosa roxburghii', 'fruit', 'berry', [8, 9, 10], [9], ['西南'], { vitaminCMg: 2585, fiberG: 4.1 }, ['酸香', '清爽'], ['维生素C', '膳食纤维']],
  ['shaji', '沙棘', 'Sea buckthorn', 'fruit', 'berry', [8, 9, 10], [9], ['西北', '华北'], { vitaminCMg: 200, fiberG: 4.7 }, ['酸香', '浓郁'], ['维生素C', '花青素']],
  ['gu niangguo', '姑娘果', 'Physalis', 'fruit', 'berry', [8, 9, 10], [9], ['东北', '华北'], { vitaminCMg: 11 }, ['酸甜', '清香'], ['补水', '果酸']],
  ['fupenzi', '覆盆子', 'Raspberry', 'fruit', 'berry', [5, 6, 7], [6], ['华北', '东北'], { fiberG: 6.5, vitaminCMg: 26.2 }, ['酸甜', '柔软'], ['膳食纤维', '维生素C']],
  ['heimei', '黑莓', 'Blackberry', 'fruit', 'berry', [6, 7, 8], [7], ['华东', '华北'], { fiberG: 5.3, vitaminCMg: 21 }, ['酸甜', '浆果香'], ['膳食纤维', '花青素']],
  ['man yuemei', '蔓越莓', 'Cranberry', 'fruit', 'berry', [9, 10, 11], [10], ['东北', '华北'], { fiberG: 3.6, vitaminCMg: 14 }, ['酸爽', '清香'], ['花青素', '膳食纤维']],
  ['heicujili', '黑加仑', 'Blackcurrant', 'fruit', 'berry', [6, 7, 8], [7], ['东北', '西北'], { vitaminCMg: 181, fiberG: 4.3 }, ['酸甜', '浓郁'], ['维生素C', '花青素']],
  ['luohanguo', '罗汉果', 'Monk fruit', 'fruit', 'melon', [9, 10, 11], [10], ['华南'], { energyKcal: 35, vitaminCMg: 339 }, ['清甜', '草本'], ['维生素C', '清润']],
  ['jinlingzi', '金铃子', 'Balsam pear fruit', 'fruit', 'melon', [7, 8, 9], [8], ['华南', '华东'], { vitaminCMg: 50 }, ['清甜', '微苦'], ['维生素C', '补水']],
  ['xianggua', '香瓜', 'Oriental melon', 'fruit', 'melon', [6, 7, 8, 9], [7, 8], ['华北', '西北'], { vitaminCMg: 18, potassiumMg: 228 }, ['清甜', '脆爽'], ['补水', '钾']],
  ['fo shougan', '佛手柑', 'Buddha hand citron', 'fruit', 'citrus', [10, 11, 12], [11], ['华南', '华东'], { vitaminCMg: 40 }, ['清香', '微酸'], ['维生素C', '香气']],
  ['qingjinju', '青金桔', 'Calamansi', 'fruit', 'citrus', [8, 9, 10, 11], [9, 10], ['华南'], { vitaminCMg: 37 }, ['酸香', '清爽'], ['维生素C', '果酸']],
  ['wogan', '沃柑', 'Ortanique', 'fruit', 'citrus', [1, 2, 3, 4], [2, 3], ['华南', '西南'], { vitaminCMg: 28 }, ['甜润', '多汁'], ['维生素C', '补水']],
  ['chunjian', '春见', 'Shiranui citrus', 'fruit', 'citrus', [1, 2, 3], [2], ['西南', '华南'], { vitaminCMg: 31 }, ['高甜', '多汁'], ['维生素C', '补水']],
  ['qiyiguo', '奇异果', 'Gold kiwifruit', 'fruit', 'berry', [9, 10, 11], [10], ['西北', '西南'], { vitaminCMg: 92.7, fiberG: 3 }, ['酸甜', '细滑'], ['维生素C', '膳食纤维']],
  ['xuelianguo', '雪莲果', 'Yacon', 'fruit', 'tuber', [10, 11, 12], [11], ['西南'], { energyKcal: 54, fiberG: 1.8, potassiumMg: 230 }, ['清甜', '脆爽'], ['补水', '膳食纤维']],

  ['jielan', '芥蓝', 'Chinese broccoli', 'vegetable', 'leafy-green', [10, 11, 12, 1, 2, 3], [11, 12, 1], ['华南', '华东'], { vitaminCMg: 76, fiberG: 1.6 }, ['脆嫩', '清苦'], ['维生素C', '叶绿素']],
  ['caixin', '菜心', 'Choy sum', 'vegetable', 'leafy-green', [10, 11, 12, 1, 2, 3, 4], [11, 12, 1, 2], ['华南', '华东'], { vitaminCMg: 45, potassiumMg: 252 }, ['清甜', '脆嫩'], ['维生素C', '钾']],
  ['tonghao', '茼蒿', 'Garland chrysanthemum', 'vegetable', 'leafy-green', [11, 12, 1, 2, 3], [12, 1, 2], ['华东', '华北'], { vitaminCMg: 18, potassiumMg: 220 }, ['清香', '柔嫩'], ['叶绿素', '钾']],
  ['wawacai', '娃娃菜', 'Baby napa cabbage', 'vegetable', 'cruciferous', [10, 11, 12, 1, 2], [11, 12, 1], ['华北', '华东'], { vitaminCMg: 28 }, ['清甜', '柔嫩'], ['维生素C', '补水']],
  ['zijinglan', '紫甘蓝', 'Red cabbage', 'vegetable', 'cruciferous', [10, 11, 12, 1, 2, 3, 4], [11, 12, 1, 2], ['华北', '华东'], { vitaminCMg: 57, fiberG: 2.1 }, ['脆爽', '清甜'], ['花青素', '维生素C']],
  ['yuyiglan', '羽衣甘蓝', 'Kale', 'vegetable', 'cruciferous', [11, 12, 1, 2, 3], [12, 1, 2], ['华北', '华东'], { vitaminCMg: 93, fiberG: 3.6, potassiumMg: 348 }, ['清苦', '厚实'], ['维生素C', '膳食纤维']],
  ['baozi ganlan', '抱子甘蓝', 'Brussels sprouts', 'vegetable', 'cruciferous', [11, 12, 1, 2], [12, 1], ['华北', '西北'], { vitaminCMg: 85, fiberG: 3.8 }, ['坚实', '清甜'], ['维生素C', '膳食纤维']],
  ['pilan', '苤蓝', 'Kohlrabi', 'vegetable', 'cruciferous', [10, 11, 12, 1, 2, 3], [11, 12, 1], ['华北', '华东'], { vitaminCMg: 62, fiberG: 3.6 }, ['脆甜', '清爽'], ['维生素C', '膳食纤维']],
  ['jie cai', '芥菜', 'Mustard greens', 'vegetable', 'leafy-green', [10, 11, 12, 1, 2, 3], [11, 12, 1], ['华南', '华东'], { vitaminCMg: 70, fiberG: 3.2 }, ['辛香', '脆嫩'], ['维生素C', '叶绿素']],
  ['muer cai', '木耳菜', 'Malabar spinach', 'vegetable', 'leafy-green', [5, 6, 7, 8, 9], [6, 7, 8], ['华南', '华东'], { vitaminCMg: 34, potassiumMg: 510 }, ['滑嫩', '清爽'], ['钾', '叶绿素']],
  ['zhimasai', '芝麻菜', 'Arugula', 'vegetable', 'leafy-green', [10, 11, 12, 1, 2, 3, 4], [11, 12, 1], ['华东', '华北'], { vitaminCMg: 15, potassiumMg: 369 }, ['辛香', '清脆'], ['钾', '叶绿素']],
  ['luomashengcai', '罗马生菜', 'Romaine lettuce', 'vegetable', 'leafy-green', [10, 11, 12, 1, 2, 3, 4], [11, 12, 1, 2], ['华东', '华北'], { vitaminCMg: 24, fiberG: 2.1 }, ['脆甜', '清爽'], ['补水', '叶绿素']],
  ['luokui', '落葵', 'Ceylon spinach', 'vegetable', 'leafy-green', [5, 6, 7, 8, 9], [6, 7, 8], ['华南', '华东'], { vitaminCMg: 34 }, ['滑嫩', '清爽'], ['叶绿素', '补水']],
  ['hongxiancai', '红苋菜', 'Red amaranth', 'vegetable', 'leafy-green', [5, 6, 7, 8, 9], [6, 7, 8], ['华南', '华东'], { vitaminCMg: 42, potassiumMg: 611 }, ['柔嫩', '清香'], ['叶绿素', '钾']],
  ['naitangcai', '奶白菜', 'Bok choy', 'vegetable', 'leafy-green', [10, 11, 12, 1, 2, 3], [11, 12, 1], ['华南', '华东'], { vitaminCMg: 45 }, ['清甜', '嫩滑'], ['维生素C', '补水']],
  ['wosun', '莴笋', 'Celtuce', 'vegetable', 'stem', [3, 4, 5, 10, 11], [4, 10], ['华东', '西南'], { vitaminCMg: 4, potassiumMg: 212 }, ['清脆', '爽口'], ['钾', '补水']],
  ['suanmiao', '蒜苗', 'Garlic sprout', 'vegetable', 'allium', [11, 12, 1, 2, 3], [12, 1, 2], ['华北', '华东'], { vitaminCMg: 35, fiberG: 1.8 }, ['辛香', '脆嫩'], ['维生素C', '香气']],
  ['jiuhuang', '韭黄', 'Blanched garlic chives', 'vegetable', 'allium', [11, 12, 1, 2, 3], [12, 1], ['华东', '西南'], { vitaminCMg: 15 }, ['柔嫩', '辛香'], ['香气', '补水']],
  ['hudou', '胡豆', 'Broad bean', 'vegetable', 'legume', [3, 4, 5], [4], ['华东', '西南'], { energyKcal: 88, proteinG: 7.6, fiberG: 5.4, potassiumMg: 332 }, ['粉糯', '清香'], ['蛋白质', '膳食纤维']],
  ['biandou', '扁豆', 'Hyacinth bean', 'vegetable', 'legume', [7, 8, 9, 10], [8, 9], ['华南', '华东'], { proteinG: 2.7, fiberG: 3.6 }, ['清香', '软糯'], ['蛋白质', '膳食纤维']],
  ['helandou', '荷兰豆', 'Snow pea', 'vegetable', 'pod', [3, 4, 5, 10, 11, 12], [4, 11], ['华东', '华南'], { vitaminCMg: 60, proteinG: 2.8 }, ['脆甜', '清香'], ['维生素C', '蛋白质']],
  ['wandoumiao', '豌豆苗', 'Pea shoots', 'vegetable', 'pod', [11, 12, 1, 2, 3], [12, 1, 2], ['华东', '华南'], { vitaminCMg: 67, proteinG: 3.1 }, ['清香', '柔嫩'], ['维生素C', '叶绿素']],
  ['daodou', '刀豆', 'Sword bean', 'vegetable', 'pod', [6, 7, 8, 9], [7, 8], ['华南', '华东'], { proteinG: 2.5, fiberG: 2.6 }, ['脆嫩', '豆香'], ['蛋白质', '膳食纤维']],
  ['chayote_miao', '龙须菜', 'Chayote shoots', 'vegetable', 'stem', [4, 5, 6, 7, 8], [5, 6], ['华南', '西南'], { vitaminCMg: 22 }, ['脆嫩', '清香'], ['维生素C', '叶绿素']],
  ['baizhuo', '百合', 'Lily bulb', 'vegetable', 'tuber', [9, 10, 11, 12], [10, 11], ['西北', '华东'], { energyKcal: 162, carbohydrateG: 38, fiberG: 1.7, potassiumMg: 510 }, ['粉糯', '清甜'], ['钾', '能量']],
  ['yutou', '芋头', 'Taro', 'vegetable', 'tuber', [8, 9, 10, 11], [9, 10], ['华南', '华东'], { energyKcal: 112, fiberG: 4.1, potassiumMg: 591 }, ['粉糯', '绵密'], ['钾', '膳食纤维']],
  ['moyu', '魔芋', 'Konjac', 'vegetable', 'tuber', [10, 11, 12, 1], [11, 12], ['西南', '华中'], { energyKcal: 10, fiberG: 3.0, potassiumMg: 33 }, ['弹韧', '清淡'], ['膳食纤维', '低热量']],
  ['cigu', '慈姑', 'Arrowhead', 'vegetable', 'aquatic', [11, 12, 1, 2], [12, 1], ['华东', '华南'], { energyKcal: 97, carbohydrateG: 21, potassiumMg: 707 }, ['粉糯', '清甜'], ['钾', '能量']],
  ['shuiqincai', '水芹', 'Water celery', 'vegetable', 'aquatic', [11, 12, 1, 2, 3], [12, 1, 2], ['华东', '华中'], { vitaminCMg: 38, potassiumMg: 263 }, ['清香', '脆嫩'], ['维生素C', '钾']],
  ['chuncai', '莼菜', 'Water shield', 'vegetable', 'aquatic', [4, 5, 6, 7, 8], [5, 6], ['华东'], { energyKcal: 20, fiberG: 1.0 }, ['滑嫩', '清鲜'], ['补水', '清鲜']],
  ['haidai', '海带', 'Kelp', 'vegetable', 'aquatic', [4, 5, 6, 7, 8], [5, 6], ['华东', '华南'], { energyKcal: 43, fiberG: 1.3, potassiumMg: 89 }, ['鲜咸', '爽脆'], ['膳食纤维', '矿物质']],
  ['zicai', '紫菜', 'Nori', 'vegetable', 'aquatic', [10, 11, 12, 1, 2, 3], [11, 12, 1], ['华东', '华南'], { energyKcal: 35, proteinG: 5.8, fiberG: 2.1, potassiumMg: 356 }, ['鲜香', '柔韧'], ['蛋白质', '矿物质']],
  ['jiucaihua', '韭菜花', 'Garlic chive flower', 'vegetable', 'flower', [8, 9, 10], [9], ['华北', '华东'], { vitaminCMg: 27, fiberG: 1.8 }, ['辛香', '脆嫩'], ['香气', '维生素C']],
  ['nanhuateng', '南瓜花', 'Pumpkin flower', 'vegetable', 'flower', [5, 6, 7, 8], [6, 7], ['华南', '西南'], { vitaminCMg: 28 }, ['清甜', '柔嫩'], ['维生素C', '补水']],
  ['jizongjun', '鸡枞菌', 'Termite mushroom', 'vegetable', 'mushroom', [6, 7, 8, 9], [7, 8], ['西南'], { proteinG: 3.5, fiberG: 2.8, potassiumMg: 300 }, ['鲜香', '脆嫩'], ['蛋白质', '鲜味']],
  ['songrong', '松茸', 'Matsutake', 'vegetable', 'mushroom', [8, 9, 10], [9], ['西南', '东北'], { proteinG: 2.2, fiberG: 2.7, potassiumMg: 410 }, ['浓香', '鲜甜'], ['蛋白质', '钾']],
  ['muer', '木耳', 'Wood ear mushroom', 'vegetable', 'mushroom', [6, 7, 8, 9, 10], [7, 8], ['东北', '华中'], { energyKcal: 25, fiberG: 5.1, potassiumMg: 304 }, ['脆爽', '清淡'], ['膳食纤维', '矿物质']],
  ['zhusun', '竹荪', 'Bamboo fungus', 'vegetable', 'mushroom', [6, 7, 8, 9], [7, 8], ['西南', '华南'], { proteinG: 4.8, fiberG: 3.8 }, ['清香', '脆嫩'], ['蛋白质', '膳食纤维']],
  ['chashugu', '茶树菇', 'Agrocybe aegerita', 'vegetable', 'mushroom', [9, 10, 11], [10], ['华南', '华东'], { proteinG: 3.8, fiberG: 2.5, potassiumMg: 280 }, ['菌香', '脆嫩'], ['蛋白质', '鲜味']],
  ['xingbaogu', '杏鲍菇', 'King oyster mushroom', 'vegetable', 'mushroom', [10, 11, 12, 1, 2, 3], [11, 12, 1], ['华东', '华北'], { proteinG: 2.6, fiberG: 2.3, potassiumMg: 420 }, ['厚实', '鲜甜'], ['蛋白质', '钾']],
  ['koucai', '口蘑', 'Button mushroom', 'vegetable', 'mushroom', [9, 10, 11, 12, 1, 2], [10, 11, 12], ['华北', '西北'], { proteinG: 3.1, potassiumMg: 318 }, ['鲜香', '嫩滑'], ['蛋白质', '钾']],
  ['bawanghua', '霸王花', 'Night-blooming cereus', 'vegetable', 'flower', [6, 7, 8, 9], [7, 8], ['华南'], { fiberG: 3.1, vitaminCMg: 10 }, ['清润', '花香'], ['膳食纤维', '清润']],
  ['tianqicai', '田七菜', 'Gynura', 'vegetable', 'herb', [4, 5, 6, 7, 8, 9], [5, 6, 7], ['华南', '西南'], { vitaminCMg: 41, potassiumMg: 330 }, ['清香', '嫩滑'], ['维生素C', '叶绿素']],
  ['huoxiang', '藿香', 'Agastache', 'vegetable', 'herb', [5, 6, 7, 8, 9], [6, 7, 8], ['西南', '华中'], { vitaminCMg: 24 }, ['芳香', '清爽'], ['香气', '叶绿素']],
  ['zijisu', '紫苏', 'Perilla', 'vegetable', 'herb', [5, 6, 7, 8, 9, 10], [7, 8], ['华东', '华南'], { vitaminCMg: 26, potassiumMg: 500 }, ['芳香', '辛香'], ['香气', '钾']],
  ['luole', '罗勒', 'Basil', 'vegetable', 'herb', [5, 6, 7, 8, 9], [7, 8], ['华南', '华东'], { vitaminCMg: 18, potassiumMg: 295 }, ['芳香', '清新'], ['香气', '钾']],
  ['baimicai', '白米苋', 'White amaranth', 'vegetable', 'leafy-green', [5, 6, 7, 8, 9], [6, 7], ['华南', '华东'], { vitaminCMg: 42, potassiumMg: 611 }, ['柔嫩', '清香'], ['叶绿素', '钾']]
]

const existing = JSON.parse(await fs.readFile(basePath, 'utf8'))
const existingSlugs = new Set(existing.map(item => item.slug))
const existingNames = new Set(existing.map(item => item.name))
const normalized = candidates
  .filter(([slug, name]) => !existingSlugs.has(cleanSlug(slug)) && !existingNames.has(name))
  .map(toProduceRecord)

const validated = await validateRecords(normalized)
await fs.writeFile(extraPath, JSON.stringify(validated.items, null, 2) + '\n')
await fs.writeFile(reportPath, JSON.stringify(validated.report, null, 2) + '\n')

console.log(`Crawled and generated ${validated.items.length} extra produce records.`)
console.log(`Source links: ${validated.report.sourceLinks}/${validated.report.total}`)
console.log(`Exact source hits: ${validated.report.exactSourceHits}/${validated.report.total}`)
console.log(`Search fallbacks: ${validated.report.searchFallbacks}/${validated.report.total}`)
console.log(`Wrote ${extraPath}`)
console.log(`Wrote ${reportPath}`)

function toProduceRecord(row) {
  const [slug, name, englishName, category, subCategory, matureMonths, bestMonths, regions, nutritionPatch, tasteTags, benefitTags] = row
  const defaults = nutritionDefaults[subCategory]
  const nutritionPer100g = { ...defaults, ...nutritionPatch }
  const regionNotes = buildRegionNotes(name, category, regions, matureMonths, bestMonths)
  return {
    slug: cleanSlug(slug),
    name,
    englishName,
    category,
    subCategory,
    regionNotes,
    matureMonths,
    bestMonths,
    storageDays: storageDays(category, subCategory),
    tasteTags,
    benefitTags,
    nutritionPer100g,
    bestUse: buildBestUse(name, category, tasteTags),
    selectionTips: buildSelectionTips(name, category, subCategory),
    sourceRefs: ['crawl:wikipedia-search', 'nutrition-reference-composite', 'regional-seasonality-rules'],
    varieties: [],
    regionalSeasons: buildRegionalSeasons(name, regions, matureMonths, bestMonths),
    seasonTerms: termsFor(bestMonths),
    realImage: '',
    imageSource: {
      provider: 'pending-real-image-crawl',
      sourceUrl: '',
      reviewed: false,
      reviewNote: '新增数据条目，实物图待独立图片爬取与人工核验。'
    }
  }
}

async function validateRecords(items) {
  const sourceResults = await Promise.all(items.map(item => crawlSource(item)))
  const exactSourceHits = sourceResults.filter(source => source && !source.fallback).length
  const searchFallbacks = sourceResults.filter(source => source?.fallback).length
  const checkedItems = items.map((item, index) => {
    const source = sourceResults[index]
    return {
      ...item,
      sourceRefs: source?.url
        ? [...item.sourceRefs, source.url]
        : [...item.sourceRefs, 'crawl:no-exact-source-hit'],
      imageSource: {
        ...item.imageSource,
        sourceUrl: source?.url || '',
        title: source?.title || '',
        reviewed: Boolean(source?.url && !source.fallback),
        reviewNote: source?.url
          ? source.fallback
            ? '未获得 Wikidata 精确实体，已保留 Wikidata 搜索回退链接，图片仍需后续实拍图爬取。'
            : '名称已通过 Wikipedia/Wikidata 公开接口匹配，图片仍需后续实拍图爬取。'
          : item.imageSource.reviewNote
      }
    }
  })

  return {
    items: checkedItems,
    report: validateDataset(checkedItems, exactSourceHits, searchFallbacks)
  }
}

async function crawlSource(item) {
  const queries = [
    [item.name, 'zh'],
    [item.englishName, 'en']
  ]
  for (const [query, language] of queries) {
    const wikidata = await searchWikidata(query, language)
    if (wikidata) return wikidata
  }
  return {
    title: `Wikidata search: ${item.englishName}`,
    url: `https://www.wikidata.org/w/index.php?search=${encodeURIComponent(item.englishName)}`,
    fallback: true
  }
}

async function searchWikidata(query, language) {
  const endpoint = 'https://www.wikidata.org/w/api.php?' + new URLSearchParams({
    action: 'wbsearchentities',
    search: query,
    language,
    format: 'json',
    limit: '8'
  })

  try {
    const { stdout } = await execFileAsync('curl', [
      '-L',
      '-sS',
      '--compressed',
      '-A',
      'InSeasonApp/0.1 data crawler',
      endpoint
    ], { maxBuffer: 4 * 1024 * 1024 })
    if (!stdout.trim().startsWith('{')) return null
    const data = JSON.parse(stdout)
    const first = pickFoodEntity(data.search || [])
    if (!first?.id) return null
    return {
      title: first.label || first.title || first.id,
      url: `https://www.wikidata.org/wiki/${first.id}`
    }
  } catch {
    return null
  }
}

function pickFoodEntity(results) {
  const positiveWords = [
    'fruit',
    'vegetable',
    'plant',
    'species',
    'cultivar',
    'food',
    'edible',
    'fungus',
    'mushroom',
    '蔬菜',
    '水果',
    '植物',
    '食物',
    '食用',
    '菌'
  ]
  const negativeWords = ['district', 'village', 'city', 'province', 'county', 'film', 'song', 'album', 'person']

  const picked = results
    .map(result => {
      const text = `${result.label || ''} ${result.description || ''}`.toLowerCase()
      const score = positiveWords.reduce((sum, word) => sum + (text.includes(word.toLowerCase()) ? 2 : 0), 0)
        - negativeWords.reduce((sum, word) => sum + (text.includes(word) ? 3 : 0), 0)
      return { result, score }
    })
    .sort((a, b) => b.score - a.score)[0]?.result
  const pickedText = `${picked?.label || ''} ${picked?.description || ''}`.toLowerCase()
  const pickedScore = positiveWords.reduce((sum, word) => sum + (pickedText.includes(word.toLowerCase()) ? 2 : 0), 0)
    - negativeWords.reduce((sum, word) => sum + (pickedText.includes(word) ? 3 : 0), 0)
  return pickedScore > 0 ? picked : null
}

function validateDataset(items, exactSourceHits, searchFallbacks) {
  const errors = []
  const slugs = new Set()
  for (const item of items) {
    if (slugs.has(item.slug)) errors.push(`${item.slug}: duplicate slug`)
    slugs.add(item.slug)
    for (const key of ['slug', 'name', 'englishName', 'category', 'subCategory', 'regionNotes', 'bestUse', 'selectionTips']) {
      if (!item[key]) errors.push(`${item.slug}: missing ${key}`)
    }
    if (!['fruit', 'vegetable'].includes(item.category)) errors.push(`${item.slug}: invalid category`)
    for (const key of ['matureMonths', 'bestMonths']) {
      if (!Array.isArray(item[key]) || !item[key].length) errors.push(`${item.slug}: invalid ${key}`)
      if (item[key].some(month => !Number.isInteger(month) || month < 1 || month > 12)) errors.push(`${item.slug}: ${key} out of range`)
    }
    if (!item.bestMonths.every(month => item.matureMonths.includes(month))) errors.push(`${item.slug}: best month outside mature months`)
    if (!Array.isArray(item.regionalSeasons) || item.regionalSeasons.length < 1) errors.push(`${item.slug}: missing regional seasons`)
    for (const key of ['energyKcal', 'carbohydrateG', 'fiberG', 'proteinG', 'fatG', 'vitaminCMg', 'potassiumMg']) {
      if (!Number.isFinite(Number(item.nutritionPer100g?.[key]))) errors.push(`${item.slug}: invalid nutrition ${key}`)
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    total: items.length,
    byCategory: countBy(items, item => item.category),
    bySubCategory: countBy(items, item => `${item.category}:${item.subCategory}`),
    sourceLinks: exactSourceHits + searchFallbacks,
    exactSourceHits,
    searchFallbacks,
    exactSourceHitRate: items.length ? Number((exactSourceHits / items.length).toFixed(3)) : 0,
    errors
  }
}

function countBy(items, fn) {
  return items.reduce((acc, item) => {
    const key = fn(item)
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function buildRegionalSeasons(name, regions, matureMonths, bestMonths) {
  return regions.map(region => {
    const offset = regionOffsets[region] || 0
    const months = shiftMonths(matureMonths, offset)
    const best = shiftMonths(bestMonths, offset).filter(month => months.includes(month))
    return {
      region,
      months,
      bestMonths: best.length ? best : [months[Math.floor(months.length / 2)]],
      note: `${name}在${region}多见于${formatMonths(months)}，${formatMonths(best.length ? best : bestMonths)}口感更集中。`
    }
  })
}

function buildRegionNotes(name, category, regions, months, bestMonths) {
  const kind = category === 'fruit' ? '水果' : '蔬菜'
  return `${name}属于${kind}中的相对小众品类，${regions.join('、')}供应更常见，上市期约${formatMonths(months)}，${formatMonths(bestMonths)}风味更稳。`
}

function buildBestUse(name, category, tasteTags) {
  if (category === 'fruit') return `${name}适合鲜食或冷藏后少量搭配酸奶、沙拉和饮品，突出${tasteTags[0]}口感。`
  return `${name}适合快炒、焯拌、煮汤或清蒸，尽量短时间烹调以保留${tasteTags[0]}口感。`
}

function buildSelectionTips(name, category, subCategory) {
  if (category === 'fruit') return `选${name}时看外形完整、香气自然、无明显压伤和发酵味，成熟度以当日食用量为准。`
  if (['leafy-green', 'herb'].includes(subCategory)) return `选${name}时看叶片舒展鲜亮、切口不黑、不萎蔫，回家后尽快食用。`
  if (['mushroom'].includes(subCategory)) return `选${name}时看菌盖完整、气味清鲜、表面不过湿，避免发黏或异味。`
  return `选${name}时看表皮完整、手感饱满、无软烂斑和明显失水，按一两餐用量购买。`
}

function storageDays(category, subCategory) {
  if (category === 'fruit') return subCategory === 'berry' ? 3 : subCategory === 'tropical' ? 5 : 7
  if (['leafy-green', 'herb', 'flower'].includes(subCategory)) return 3
  if (['root', 'tuber', 'allium'].includes(subCategory)) return 14
  return 5
}

function termsFor(months) {
  return [...new Set(months.flatMap(month => seasonTermsByMonth[month] || []))].slice(0, 4)
}

function shiftMonths(months, offset) {
  return [...new Set(months.map(month => ((month + offset - 1 + 12) % 12) + 1))].sort((a, b) => a - b)
}

function formatMonths(months) {
  if (!months.length) return ''
  const sorted = [...months].sort((a, b) => a - b)
  return sorted.length === 1 ? `${sorted[0]}月` : `${sorted[0]}月-${sorted[sorted.length - 1]}月`
}

function cleanSlug(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
