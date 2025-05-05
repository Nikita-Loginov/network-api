const bcrypt = require("bcryptjs");
const jdenticon = require("jdenticon");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const { prisma } = require("../prisma/prisma-client");
require("dotenv").config();

const UserController = {
  register: async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        status: false,
        message: "Все поля должны быть заполнены",
        fields: ["email", "password", "name"],
      });
    }

    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });

      if (existingUser) {
        return res.status(400).json({
          status: false,
          message: "Такой пользователь уже есть",
        });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const avatarPng = jdenticon.toPng(name, 200);
      const avatarName = `${name}_${Date.now()}.png`;
      const avatarPath = path.join(__dirname, "../uploads", avatarName);
      fs.writeFileSync(avatarPath, avatarPng);

      const user = await prisma.user.create({
        data: {
          email,
          password: passwordHash,
          name,
          avatarUrl: `/uploads/${avatarName}`,
        },
      });

      return res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      console.error("Ошибка при регистрации:", error);
      res.status(500).json({
        status: false,
        message: "Ошибка сервера при регистрации",
        error: error.message,
      });
    }
  },
  login: async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Все поля должны быть заполнены" });
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return res.status(401).json({ message: "Неверный email или пароль" });
      }

      const valid = await bcrypt.compare(password, user.password);

      if (!valid) {
        return res.status(401).json({ message: "Неверный email или пароль" });
      }

      const token = jwt.sign({ userId: user.id }, process.env.SECRET_KEY);

      res.json({ token });
    } catch (error) {
      console.error("Ошибка при входе", error);
      res.status(500).json({ error: "Ошибка при входе" });
    }
  },
  getUserById: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          followers: true,
          following: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      const isFollowing = await prisma.follows.findFirst({
        where: {
          AND: [{ followerId: userId }, { followingId: id }],
        },
      });

      res.json({ ...user, isFollowing: Boolean(isFollowing) });
    } catch (error) {
      res.status(400).json({ error: "Ошибка на сервере" });
      console.error("Ошибка при получения id usera", error);
    }
  },
  updateUser: async (req, res) => {
    const { id } = req.params;
    const { email, name, dateOfBirth, bio, location } = req.body;

    let filePath;

    if (req.file && req.file.path) {
      filePath = req.file.path;
    }

    if (id !== req.user.userId) {
      return res.status(403).join({ error: "Нет доступа" });
    }

    try {
      if (email) {
        const existingUser = await prisma.user.findFirst({
          where: { email },
        });

        if (existingUser && existingUser.id !== id) {
          return res.status(400).json({ error: "Почта уже используется" });
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data: {
          email: email || undefined,
          name: name || undefined,
          avatarUrl: filePath ? `/${filePath}` : undefined,
          dateOfBirth: dateOfBirth || undefined,
          bio: bio || undefined,
          location: location || undefined,
        },
      });

      res.json(user);
    } catch (error) {
      console.error("Ошибка при обновление пользователя", error);
      res.status(400).json({ error: "Ошибка при обновление пользователя" });
    }
  },
  current: async (req, res) => {
   const userId = req.user.userId;

   try {
    const user = await prisma.user.findUnique({
      where : {
        id : userId
      },
      include : {
        followers : {
          include : {
            follower : true
          }
        },
        following : {
          include : {
            following : true
          }
        }
      }
    })
    
    if (!user) {
      return res.status(400).json({error : 'Не удалось найти пользователя'})
    }

    res.json(user)
   } catch (error) {
      console.error('Ошибка получения юзера', error);
      res.status(500).json({error: 'Серверная ошибка'})
   }
  },
};

module.exports = UserController;
