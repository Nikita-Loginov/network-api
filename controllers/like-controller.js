const { prisma } = require("../prisma/prisma-client");

const LikeController = {
  likePost: async (req, res) => {
    const { postId } = req.body;
    const userId = req.user.userId;

    if (!postId) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    try {
      const existingLike = await prisma.like.findFirst({
        where: { postId, userId },
      });

      if (existingLike) {
        return res.status(400).json({ error: "Вы уже поставили лайк" });
      }

      const like = await prisma.like.create({
        data: { postId, userId },
      });

      res.json(like);
    } catch (error) {
      console.error("Ошибка при создание лайка", error);
      res.status(500).json({ error: "Ошибка на сервере" });
    }
  },
  unLikePost: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!id) {
      return res.status(400).json({ error: "Не верный Id" });
    }

    try {
      const existingLike = await prisma.like.findFirst({
        where: { postId : id, userId },
      });

      if (!existingLike) {
        return res.status(400).json({ error: "Нельзя поставить дизлайк" });
      }

      const like = await prisma.like.deleteMany({
        where : {postId : id, userId}
      })

      res.json(like)
    } catch (error) {
        console.error("Ошибка при удаление лайка", error);
        res.status(500).json({ error: "Ошибка на сервере" });
    }
  },
};

module.exports = LikeController;
