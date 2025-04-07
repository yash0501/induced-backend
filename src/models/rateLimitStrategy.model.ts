import { Model, DataTypes, Sequelize } from 'sequelize';
import RateLimitConfig from './rateLimitConfig.model';

class RateLimitStrategy extends Model {
  public id!: number;
  public name!: string;
  public description!: string | null;

  // Associations
  public static associate() {
    RateLimitStrategy.hasMany(RateLimitConfig, { foreignKey: 'strategyId', as: 'rateLimitConfigs' });
  }

  public static initialize(sequelize: Sequelize) {
    RateLimitStrategy.init({
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    }, {
      sequelize,
      tableName: 'RateLimitStrategy',
      timestamps: false
    });
  }
}

export default RateLimitStrategy;
