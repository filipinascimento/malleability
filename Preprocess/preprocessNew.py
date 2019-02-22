
import matplotlib
# matplotlib.use('Qt5Agg')
import numpy as np;
import matplotlib.pyplot as plt;
import os;
import math;
from matplotlib.patches import Polygon
from matplotlib.collections import PatchCollection
import prettyplotlib as pplt;
from matplotlib import cm;
from matplotlib import rc
import matplotlib as mpl;

mpl.rcParams['text.usetex'] = False
mpl.rcParams['text.latex.unicode'] = True

mpl.rcParams['text.latex.preamble'] = [
    r"\usepackage{textgreek}",
    r"\usepackage{siunitx}"]

rc('font',**{'family':'sans-serif','sans-serif':['Helvetica']})
rc('font',**{'family':'serif','serif':['Times']})
rc('text', usetex=False)


filenames = [
	("US_Power_Grid","US Power Grid"),
	("CA-GrQc", "Collaboration"),
	("BA_N5000_K6", "BA"),
	( "SW2Dp0.005", "WS"),
	( "RAGEO2D_N5000_K5", "Random GEO"),
	( "ER_N5000_K5", "ER"),
	( "CR_N5000_K6", "Crystal"),
	( "WAX2D_N5000_K5", "WAX"),
	( "wiki", "Wiki"),
	("Gyor-GyorMosonSopron-Hungary", "Gyor City"),
	("Hafar_alBaTin-Eastern-Saudi_Arabia", "Hafar City")
];


fileDictionary = {networkName:filename for filename,networkName in filenames};
propertyNames = [
	"avgL",
	"Cc",
	"Ad",
	"Ed",
];


def entropy(hist, bit_instead_of_nat=False):
    """
    given a list of positive values as a histogram drawn from any information source,
    returns the entropy of its probability density function. Usage example:
      hist = [513, 487] # we tossed a coin 1000 times and this is our histogram
      print entropy(hist, True)  # The result is approximately 1 bit
      hist = [-1, 10, 10]; hist = [0] # this kind of things will trigger the warning
    """
    h = np.asarray(hist, dtype=np.float64)
    if h.sum()<=0 or (h<0).any():
        print("[entropy] WARNING, malformed/empty input %s. Returning None."%str(hist));
        return None
    h = h/h.sum()
    log_fn = np.ma.log2 if bit_instead_of_nat else np.ma.log
    return -(h*log_fn(h)).sum()


import subprocess
malleabilities  = {name:[] for filename,name in filenames};
normalizedMalleabilities = {name:[] for filename,name in filenames};
header = [];
propertyCount = len(propertyNames);
for propertyIndex in range(propertyCount+1):
	if(propertyIndex < propertyCount):
		propertyName = propertyNames[propertyIndex];
	else:
		propertyName = "All";
	header.append(propertyName);
	originalValues = {};
	with open("newOriginal.txt","r") as fd:
		for line in fd:
			entries = line.split("\t");
			originalValues[entries[0]] = [float(value) for value in entries[1:]];


	for filename,name in filenames:
		print("loading data for %s (%s)"%(name,propertyName));
		with open(filename+"_preprocessed.txt","w") as preFD:
			with open(filename+"_0_v2.txt","r") as fd:
				for line in fd:
					entry = line.strip().split("\t");
					if(propertyIndex < propertyCount):
						entryFiltered = entry[propertyIndex:(propertyIndex+1)];
					else:
						entryFiltered = entry;
					preFD.write("\t".join(["%0.12f"%(round(float(value),12)) for value in entryFiltered])+"\n");
			
		bashCommand = "./sortPreprocessed.sh "+filename+"_preprocessed.txt"
		process = subprocess.Popen(bashCommand.split(), stdout=subprocess.PIPE)
		output, error = process.communicate()
		counts = [];
		previousLine = "";
		linesCount = 0;
		for line in output.decode("utf-8").strip().split("\n"):
			linesCount+=1;
			if(line!=previousLine):
				counts.append(1);
			else:
				counts[-1]+=1;
			previousLine = line;
		malleabilities[name].append(np.exp(entropy(np.array(counts))));
		normalizedMalleabilities[name].append(round(np.exp(entropy(np.array(counts)))/linesCount,6));



with open("malleabilityTable_v3.txt","w") as tableFD:
	tableFD.write("network\t"+"\t".join(["M(%s)"%entry for entry in header]+["nM(%s)"%entry for entry in header])+"\n");
	for name in malleabilities:
		values = malleabilities[name]+normalizedMalleabilities[name];
		tableFD.write("%s\t"%name);
		tableFD.write("\t".join(["%g"%value for value in values])+"\n");



with open("complete_malleabilityTable_v3.txt","w") as tableFD:
	tableFD.write("network\t"+"\t".join(["%s"%entry for entry in header[0:-1]])+"\t"+"\t".join(["M(%s)"%entry for entry in header]+["nM(%s)"%entry for entry in header])+"\n");
	for name in malleabilities:
		originalName = fileDictionary[name];
		values = originalValues[originalName]+malleabilities[name]+normalizedMalleabilities[name];
		tableFD.write("%s\t"%name);
		tableFD.write("\t".join(["%g"%value for value in values])+"\n");

