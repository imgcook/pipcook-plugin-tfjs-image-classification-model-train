import { ImageDataset, ModelTrainType, UniModel, ModelTrainArgsType } from '@pipcook/pipcook-core';

import * as tf from '@tensorflow/tfjs-node';

/**
 * this is plugin used to train tfjs model with pascal voc data format for image classification problem.
 * @param data : train data
 * @param model : model loaded before
 * @param epochs : need to specify epochs
 * @param batchSize : need to specify batch size
 * @param optimizer : need to specify optimizer
 */
const ModelTrain: ModelTrainType = async (data: ImageDataset, model: UniModel, args: ModelTrainArgsType): Promise<UniModel> => {
  const {
    epochs = 10,
    batchSize = 16,
    modelPath
  } = args;

  const { trainLoader, validationLoader } = data;

  const count = await trainLoader.len();

  let valBatchesPerEpoch: number;
  if (validationLoader) {
    const valCount = await validationLoader.len();
    valBatchesPerEpoch = Math.floor(valCount / batchSize);
  }

  const batchesPerEpoch = Math.floor(count / batchSize);
  const trainModel = model.model;

  for (let i = 0; i < epochs; i++) {
    console.log(`Epoch ${i}/${epochs} start`);
    for (let j = 0; j < batchesPerEpoch; j++) {
      const dataBatch = await data.trainLoader.nextBatch(batchSize);
      const xs = tf.tidy(() => tf.stack(dataBatch.map((ele) => ele.data)));
      const ys = tf.tidy(() => tf.stack(dataBatch.map((ele) => ele.label)));
      const trainRes = await trainModel.trainOnBatch(xs, ys);
      xs.dispose();
      ys.dispose();
      if (j % Math.floor(batchesPerEpoch / 10) === 0) {
        console.log(`Iteration ${j}/${batchesPerEpoch} result --- loss: ${trainRes[0]} accuracy: ${trainRes[1]}`);
      }
    }
    if (validationLoader) {
      let loss = 0;
      let accuracy = 0;
      for (let j = 0; j < valBatchesPerEpoch; j++) {
        const dataBatch = await validationLoader.nextBatch(batchSize);
        const xs = tf.tidy(() => tf.stack(dataBatch.map((ele) => ele.data)));
        const ys = tf.tidy(() => tf.stack(dataBatch.map((ele) => ele.label)));
        const evaluateRes = await trainModel.evaluate(xs, ys);
        xs.dispose();
        ys.dispose();
        loss += Number(evaluateRes[0].dataSync());
        accuracy += Number(evaluateRes[1].dataSync());
      }
      loss /= valBatchesPerEpoch;
      accuracy /= valBatchesPerEpoch;
      console.log(`Validation Result ${i}/${epochs} result --- loss: ${loss} accuracy: ${accuracy}`);
    }
  }

  await trainModel.save(`file://${modelPath}`);

  return {
    ...model,
    model: trainModel
  };
};

export default ModelTrain;
