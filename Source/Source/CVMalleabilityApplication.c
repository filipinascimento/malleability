//
//  CVMaleabilityApplication.c
//  CVNetwork
//
//  Created by Filipi Nascimento Silva on 10/29/16.
//  Copyright © 2016 Filipi Nascimento Silva. All rights reserved.
//

#include "CVNetwork.h"
#include "CVNetworkCentrality.h"
#include "CVDistribution.h"
#include "CVConcentricStructure.h"
#include "CVNetworkMeasurements.h"
#include "CVGrid.h"
#include "CVRandomRewiring.h"
#include "CVSet.h"
#include "CVDictionary.h"




#define kDensitySampleIterations 100000

static const CVNetworkMeasurementFunction k_measurementsFunctions[] = {
	CVMakeMeasurementFunction("Average Shortest Path", CVAverageShortestPathLength),
	CVMakeMeasurementFunction("Average Clustering Coefficient", CVNetworkAverageClusteringCoefficient),
	CVMakeMeasurementFunction("Degree Assortativity", CVNetworkDegreeAssortativity),
	CVMakeMeasurementFunction("Degree Entropy", CVNetworkDegreeEntropy),
};

static CVSize k_measurementsCount = 4;



CV_INLINE void CVMaleabilityGetNetworkProperties(const CVNetwork* network, const CVNetworkMeasurementFunction* measurements, CVSize measurementsCount, CVDouble* values){
	for (CVIndex measurementIndex=0; measurementIndex<measurementsCount; measurementIndex++) {
		CVNetworkMeasurementFunction measurementFunction = measurements[measurementIndex];
		values[measurementIndex] = measurementFunction.function(network,measurements[measurementIndex].context);
	}
}



void CVMalleabilitySimulate(const CVNetwork* network,const CVNetworkMeasurementFunction* measurements, CVSize measurementsCount, CVSize iterationsCount, CVDoubleArray* history, CVDouble* originalValues){
		// CVParallelForStart(centralityLoop, subIteration, kDensitySampleIterations){
			
		for(CVIndex iteration=0; iteration<iterationsCount; iteration++){
			CVNetworkRewireEntry rewireEntry = CVNetworkRandomRewireEntry(network);
			CVNetwork* sampleNetwork = CVNewNetworkWithNetworkAndRewire(network, rewireEntry);
			CVDouble* values = calloc(measurementsCount,sizeof(CVDouble));
			CVMaleabilityGetNetworkProperties(sampleNetwork, measurements, measurementsCount, values);
			for(CVIndex i=0;i<measurementsCount;i++){
				CVDoubleArrayAdd(values[i]-originalValues[i],history);
			}
			free(values);
			CVNetworkDestroy(sampleNetwork);
		}//CVParallelForEnd(centralityLoop);
}



int main(int argc,char *argv[]){
	CVRandomSeedDev();
	CVString networkPath = NULL;
	CVString outputPath = NULL;

	if(argc!=3){
    printf("unexpected number of arguments\n");
    return -1;
	}else{
		networkPath = argv[1];
		outputPath = argv[2];
	}
	FILE* networkFile = fopen(networkPath,"r");
	if(!networkFile){
    printf("Cannot load file \"%s\". \n",networkPath);
	}
	CVNetwork* network = CVNewNetworkFromXNETFile(networkFile);
	CVDouble* originalValues = calloc(k_measurementsCount,sizeof(CVDouble));
	CVMaleabilityGetNetworkProperties(network, k_measurementsFunctions, k_measurementsCount, originalValues);
	
	for (CVIndex index=0; index<k_measurementsCount; index++) {
		if(index){
			printf("\t");
		}
		printf("%.15f",originalValues[index]);
	}
	
	printf("\n");
	fclose(networkFile);
	
	CVIndex edgesCount = network->edgesCount;

	CVDouble* history;
	history = calloc(edgesCount*k_measurementsCount,sizeof(CVDouble));
	//for(CVIndex edgeIndex=0; edgeIndex<edgesCount;edgeIndex++){
	CVParallelForStart(malleabilityLoop, edgeIndex, edgesCount){
			printf("%"CVIndexScan"/%"CVIndexScan" (%.2f%%)                                                                 \r", edgeIndex,edgesCount,edgeIndex/(float)(edgesCount-1)*100.0);
			fflush(stdout);
			CVNetwork* sampleNetwork = CVNewNetworkByRemovingEdgeFast(network, edgeIndex);
			CVDouble* values = calloc(k_measurementsCount,sizeof(CVDouble));
			CVMaleabilityGetNetworkProperties(sampleNetwork, k_measurementsFunctions, k_measurementsCount, values);
			for(CVIndex i=0;i<k_measurementsCount;i++){
				history[edgeIndex*k_measurementsCount+i] = values[i]-originalValues[i];
			}
			free(values);
			CVNetworkDestroy(sampleNetwork);
	}CVParallelForEnd(malleabilityLoop);

	FILE* historyFile = fopen(outputPath,"w");
	// printf("Saving %d entries.\n",(int)history.count);
	for (CVIndex index=0; index<edgesCount*k_measurementsCount; index++) {
		if(index && index%k_measurementsCount==0){
			fprintf(historyFile,"\n");
		}
		fprintf(historyFile,"%.15f\t",history[index]);
	}
	fprintf(historyFile,"\n");
	fclose(historyFile);

	printf("\n");
	
	CVNetworkDestroy(network);
	return EXIT_SUCCESS;
}


