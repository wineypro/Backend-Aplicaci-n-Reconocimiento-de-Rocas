const { Op } = require('sequelize')
const { HttpError } = require('../utils/httpError')

const parseBound = value => {
  if (value === undefined || value === '') throw new HttpError(400, 'Los parámetros min y max son obligatorios')
  const parsed = typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(parsed) || parsed < 0) throw new HttpError(400, 'min y max deben ser numéricos y no negativos')
  return parsed
}

const createRockService = ({ Rock }) => ({
  async findByHardness({ min, max } = {}) {
    const lower = parseBound(min)
    const upper = parseBound(max)
    if (lower > upper) throw new HttpError(400, 'La dureza mínima no puede ser mayor que la máxima')
    const rocks = await Rock.findAll({
      where: { hardness: { [Op.between]: [lower, upper] } },
      include: ['type', 'category'],
      order: [['hardness', 'ASC'], ['id', 'ASC']]
    })
    return { min: lower, max: upper, total: rocks.length, rocks, items: rocks }
  }
})

module.exports = { createRockService }